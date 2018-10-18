/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

export function GISWorkspaceProvider(Private, Promise, confirmModal) {
  const savedObjectsClient = Private(SavedObjectsClientProvider);
  const createOpts = { overwrite: true };
  this._type = 'gis-app';
  this.isSaving = false;
  this.description = 'GIS Saved Settings';

  this.get = async id => {
    let savedWorkspaceObject;
    if (id) {
      savedWorkspaceObject = await savedObjectsClient.get(this._type, id);
    }
    return savedWorkspaceObject ? savedWorkspaceObject : null;
  };

  this.find = async () => {
    const { savedObjects } = await savedObjectsClient.find({
      search: this.description,
      type: this._type,
      searchFields: ['description']
    });
    // Return first by default. Could eventually return multiple for selection
    return savedObjects && savedObjects.length && savedObjects[0] || null;
  };

  this.save = (gisSettings) => {
    this.isSaving = true;

    const source = this._serialize(gisSettings);
    return this._createSource(source)
      .then(objRef => {
        this.isSaving = false;
        return objRef;
      }).catch((err) => {
        this.isSaving = false;
        return Promise.reject(err);
      });
  };

  this.update = (id, gisSettings) => {
    this.isSaving = true;

    const source = this._serialize(gisSettings);
    return this._updateSource(id, source)
      .then(objRef => {
        this.isSaving = false;
        return objRef;
      }).catch(err => {
        this.isSaving = false;
        return Promise.reject(err);
      });
  };

  this.getType = () => this._type;

  this._serialize = (gisSettings) => {
    // TODO: Determine best serialization
    return { description: this.description, ...gisSettings };
  };

  this._createSource = (source) => {
    return savedObjectsClient.create(this._type, source, createOpts)
      .catch(err => {
        // record exists, confirm overwriting
        if (_.get(err, 'res.status') === 409) {
          const confirmMessage =
            `Are you sure you want to overwrite the previous settings?`;

          return confirmModal(confirmMessage,
            { confirmButtonText: `Overwrite previous settings?` })
            .then(() => savedObjectsClient.create(this._type, source,
              createOpts))
            .catch(() => Promise.reject(new Error('Failed overwrite')));
        }
        return Promise.reject(err);
      });
  };

  this._updateSource = (id, source) => {
    return savedObjectsClient.update(this._type, id, source);
  };
}

uiModules.get('app/gis')
  .service('gisWorkspace', function (Private) {
    return Private(GISWorkspaceProvider);
  });

SavedObjectRegistryProvider.register(GISWorkspaceProvider);
