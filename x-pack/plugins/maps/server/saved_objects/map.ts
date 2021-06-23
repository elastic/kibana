/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from 'src/core/server';
import { APP_ICON, getFullPath } from '../../common/constants';
// @ts-ignore
import { savedObjectMigrations } from './saved_object_migrations';

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
      bounds: { dynamic: false, properties: {} }, // Disable removed field
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
        path: getFullPath(obj.id),
        uiCapabilitiesPath: 'maps.show',
      };
    },
  },
  migrations: savedObjectMigrations,
};
