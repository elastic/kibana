/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/notify';
import { uiModules } from 'ui/modules';
import { createLegacyClass } from 'ui/utils/legacy_class';
import { SavedObjectProvider } from 'ui/courier';

uiModules.get('app/gis')
  .factory('SavedGISSettings', function (Private) {
    const SavedObject = Private(SavedObjectProvider);
    createLegacyClass(SavedGISSettings).inherits(SavedObject);
    function SavedGISSettings(id) {
      SavedObject.call(this, {
        type: SavedGISSettings.type,
        mapping: SavedGISSettings.mapping,
        searchSource: SavedGISSettings.searchSource,

        id: id,
        defaults: {
          title: 'New Saved GIS Settings',
          description: '',
          columns: [],
          hits: 0,
          sort: [],
          version: 1
        },
      });

      this.showInRecentlyAccessed = false;
    }

    SavedGISSettings.type = 'GIS Settings';

    SavedGISSettings.mapping = {
      title: 'text',
      visState: 'json',
      uiStateJSON: 'text',
      description: 'text',
      savedSearchId: 'keyword',
      version: 'integer'
    };

    SavedGISSettings.fieldOrder = ['title', 'description'];

    SavedGISSettings.searchSource = false;

    return SavedGISSettings;
  });