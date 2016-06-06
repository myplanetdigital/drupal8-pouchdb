(function() {

  'use strict';

  var ENTER_KEY = 13;
  var newEntityDom = document.getElementById('new-entity');
  var syncDom = document.getElementById('sync-wrapper');

  // Set the PouchDb database.
  var db = new PouchDB('local');
  // Set the workspace used for replication in Drupal 8.
  var user = 'admin';
  var password = 'BxXEVrfonC';
  var remoteHost = 'd8.local';
  var workspace = 'live';
  var remoteCouch = new PouchDB('http://' + user + ':' + password + '@' + remoteHost + '/relaxed/' + workspace);
  // Set the entity type id.
  var entity_type = 'article';

  //PouchDB.debug.enable('*');
  //PouchDB.debug.disable('*');

  db.changes({
    since: 'now',
    live: true
  }).on('change', showEntities);

  //addEventListeners();
  showEntities();

  if (remoteCouch) {
    sync();
  }

  /*
  function addEntity(text) {    
    var name = [{'value' : text}];
    var entity = {
      _id: entity_type + '.' + PouchDB.utils.uuid(),
      name: name,
      type: entity_type,
    };
    db.put(entity, function callback(err, result) {
      if (!err) {
        console.log('Successfully posted an entity!');
      }
    });
  }
  */

  // Show the current list of entities by reading them from the database
  function showEntities() {
    db.allDocs({include_docs: true, descending: true}, function(err, doc) {
      redrawEntitiesUI(doc.rows);
    });
  }

  function checkboxChanged(entity, event) {
    console.log(event.target.checked);
    entity.en.field_done[0].value = (event.target.checked) ? 1 : 0;
    db.put(entity);
  }

  // User pressed the delete button for a entity, delete it
  function deleteButtonPressed(entity) {
    db.remove(entity);
  }

  // The input box when editing a entity has blurred, we should save
  // the new title or delete the entity if the title is empty
  function entityBlurred(entity, event) {
    var trimmedText = event.target.value.trim();
    if (!trimmedText) {
      db.remove(entity);
    } else {
      // update pouch docs with new field values
      entity.en.title[0].value = trimmedText;
      db.put(entity);
    }
  }

  // Initialise a sync with the remote server
  // see: https://pouchdb.com/guides/replication.html
  function sync() {
    syncDom.setAttribute('data-sync-state', 'syncing');

    var sync = db.sync(remoteCouch, {
      live: true, // real time
      retry: true // keep trying if we lose network connection
    }).on('error', function (err) {
      // totally unhandled error (shouldn't happen)
      console.log(err);
      syncError();
    });
    sync.cancel();
  }

  function syncError() {
    syncDom.setAttribute('data-sync-state', 'error');
  }

  function entityClicked(entity) {
    var div = document.getElementById('li_' + entity._id);
    var inputEditEntity = document.getElementById('input_' + entity._id);
    div.className = 'editing';
    inputEditEntity.focus();
  }

  function entityKeyPressed(entity, event) {
    if (event.keyCode === ENTER_KEY) {
      var inputEditEntity = document.getElementById('input_' + entity._id);
      inputEditEntity.blur();
    }
  }

  function createEntityListItem(entity) {
    var checkbox = document.createElement('input');
    checkbox.className = 'toggle';
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', checkboxChanged.bind(this, entity));

    var label = document.createElement('label');
    var node_title = entity.en.title[0].value;
    label.appendChild( document.createTextNode(node_title));
    
    label.addEventListener('click', entityClicked.bind(this, entity));

    var deleteLink = document.createElement('button');
    deleteLink.className = 'destroy';
    deleteLink.addEventListener( 'click', deleteButtonPressed.bind(this, entity));

    var divDisplay = document.createElement('div');
    divDisplay.className = 'view';
    divDisplay.appendChild(checkbox);
    divDisplay.appendChild(label);
    divDisplay.appendChild(deleteLink);

    var inputEditEntity = document.createElement('input');
    inputEditEntity.id = 'input_' + entity._id;
    inputEditEntity.className = 'edit';
    inputEditEntity.value = node_title;
    inputEditEntity.addEventListener('keypress', entityKeyPressed.bind(this, entity));
    inputEditEntity.addEventListener('blur', entityBlurred.bind(this, entity));

    var li = document.createElement('li');
    li.id = 'li_' + entity._id;
    li.appendChild(divDisplay);
    li.appendChild(inputEditEntity);

    if (entity.en.field_done.length > 0 && entity.en.field_done[0].value == 1) {
      li.className += 'complete';
      checkbox.checked = true;
    }

    return li;
  }

  function redrawEntitiesUI(entities) {
    var ul = document.getElementById('entity-list');
    ul.innerHTML = '';
    entities.forEach(function(entity) {
      if(entity.doc['@type'] == 'node' && entity.doc.en.type[0].target_id == 'article') {
        ul.appendChild(createEntityListItem(entity.doc));
      }
    });
  }

  
  function newEntityKeyPressHandler( event ) {
    if (event.keyCode === ENTER_KEY) {
      addEntity(newEntityDom.value);
      newEntityDom.value = '';
    }
  }

  function addEventListeners() {
    newEntityDom.addEventListener('keypress', newEntityKeyPressHandler, false);
  }
  

})();
