/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsType } from 'src/core/server';
import { APP_ICON, getExistingMapPath } from '../../common/constants';
// @ts-ignore
import { migrations } from './migrations';

export const mapSavedObjects: SavedObjectsType = {
  name: 'map',
  hidden: false,
  namespaceType: 'single',
  mappings: {
    properties: {
      description: { type: 'text' },
      title: { type: 'text' },
      version: { type: 'integer' },
      mapStateJSON: { type: 'text' },
      layerListJSON: { type: 'text' },
      uiStateJSON: { type: 'text' },
    },
  },
  management: {
    icon: APP_ICON,
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
    getInAppUrl(obj) {
      return {
        path: getExistingMapPath(obj.id),
        uiCapabilitiesPath: 'maps.show',
      };
    },
  },
  migrations: migrations.map,
};
