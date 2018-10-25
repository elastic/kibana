/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { createLegacyClass } from 'ui/utils/legacy_class';
import { SavedObjectProvider } from 'ui/courier';

const module = uiModules.get('app/gis');

module.factory('SavedGisWorkspace', function (Private) {
  const SavedObject = Private(SavedObjectProvider);
  createLegacyClass(SavedGisWorkspace).inherits(SavedObject);
  function SavedGisWorkspace(id) {
    SavedGisWorkspace.Super.call(this, {
      type: SavedGisWorkspace.type,
      mapping: SavedGisWorkspace.mapping,
      searchSource: SavedGisWorkspace.searchsource,

      // if this is null/undefined then the SavedObject will be assigned the defaults
      id: id,

      // default values that will get assigned if the doc is new
      defaults: {
        title: 'New Workspace',
        description: '',
      },
    });

    this.showInRecentlyAccessed = true;
  }

  SavedGisWorkspace.type = 'gis-workspace';

  SavedGisWorkspace.mapping = {
    title: 'text',
    description: 'text',
  };

  SavedGisWorkspace.fieldOrder = ['title', 'description'];

  SavedGisWorkspace.searchsource = false;

  SavedGisWorkspace.prototype.getFullPath = function () {
    return `/app/gis#workspace/${this.id}`;
  };

  return SavedGisWorkspace;
});
