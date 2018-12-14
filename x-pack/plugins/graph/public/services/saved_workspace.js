/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { clone, assign } from 'lodash';
import { uiModules } from 'ui/modules';
import { SavedObjectProvider } from 'ui/courier';

const module = uiModules.get('app/dashboard');

export function SavedWorkspaceProvider(Private) {
  // SavedWorkspace constructor. Usually you'd interact with an instance of this.
  // ID is option, without it one will be generated on save.
  const SavedObject = Private(SavedObjectProvider);
  class SavedWorkspace extends SavedObject {
    constructor(id) {
      // Gives our SavedWorkspace the properties of a SavedObject
      super ({
        type: SavedWorkspace.type,
        mapping: SavedWorkspace.mapping,
        searchSource: SavedWorkspace.searchsource,
        extractReferences: SavedWorkspace.extractReferences,
        injectReferences: SavedWorkspace.injectReferences,

        // if this is null/undefined then the SavedObject will be assigned the defaults
        id: id,

        // default values that will get assigned if the doc is new
        defaults: {
          title: 'New Graph Workspace',
          numLinks: 0,
          numVertices: 0,
          wsState: '{}',
          version: 1
        }

      });

      // Overwrite the default getDisplayName function which uses type and which is not very
      // user friendly for this object.
      this.getDisplayName = function () {
        return 'graph workspace';
      };
    }

  } //End of class

  SavedWorkspace.type = 'graph-workspace';

  // if type:workspace has no mapping, we push this mapping into ES
  SavedWorkspace.mapping = {
    title: 'text',
    description: 'text',
    numLinks: 'integer',
    numVertices: 'integer',
    version: 'integer',
    wsState: 'json'
  };

  SavedWorkspace.searchsource = false;

  SavedWorkspace.extractReferences = (source) => {
    const references = clone(source.references) || {};
    // For some reason, wsState comes in stringified 2x
    const state = JSON.parse(JSON.parse(source.wsState));
    references.indexPattern = state.indexPattern;
    state.indexPatternReference = 'indexPattern';
    delete state.indexPattern;
    return assign({}, source, {
      references,
      wsState: JSON.stringify(JSON.stringify(state))
    });
  };

  SavedWorkspace.injectReferences = function (references) {
    const state = JSON.parse(this.wsState);
    state.indexPattern = references[state.indexPatternReference];
    delete state.indexPatternReference;
    this.wsState = JSON.stringify(state);
  };

  return SavedWorkspace;
}

// Used only by the savedDashboards service, usually no reason to change this
module.factory('SavedGraphWorkspace', function (Private) {
  return Private(SavedWorkspaceProvider);
});
