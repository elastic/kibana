/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import type { CoreSetup, SavedObjectUnsanitizedDoc } from 'kibana/server';
import type { SavedObjectMigrationMap } from 'src/core/server';
import { MigrateFunctionsObject } from '../../../../../src/plugins/kibana_utils/common';
import { mergeSavedObjectMigrationMaps } from '../../../../../src/core/server';
import { APP_ICON, getFullPath } from '../../common/constants';
import { migrateDataPersistedState } from '../../common/migrations/migrate_data_persisted_state';
import type { MapSavedObjectAttributes } from '../../common/map_saved_object_type';
import { savedObjectMigrations } from './saved_object_migrations';

export function setupSavedObjects(
  core: CoreSetup,
  getFilterMigrations: () => MigrateFunctionsObject
) {
  core.savedObjects.registerType({
    name: 'map',
    hidden: false,
    namespaceType: 'multiple-isolated',
    convertToMultiNamespaceTypeVersion: '8.0.0',
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
    migrations: () => {
      return mergeSavedObjectMigrationMaps(
        savedObjectMigrations,
        getPersistedStateMigrations(getFilterMigrations()) as unknown as SavedObjectMigrationMap
      );
    },
  });

  /*
   * The maps-telemetry saved object type isn't used, but in order to remove these fields from
   * the mappings we register this type with `type: 'object', enabled: true` to remove all
   * previous fields from the mappings until https://github.com/elastic/kibana/issues/67086 is
   * solved.
   */
  core.savedObjects.registerType({
    name: 'maps-telemetry',
    hidden: false,
    namespaceType: 'agnostic',
    mappings: {
      // @ts-ignore Core types don't support this since it's only really valid when removing a previously registered type
      type: 'object',
      enabled: false,
    },
  });
}

/**
 * This creates a migration map that applies external plugin migrations to persisted state stored in Maps
 */
export const getPersistedStateMigrations = (
  filterMigrations: MigrateFunctionsObject
): MigrateFunctionsObject =>
  mapValues(
    filterMigrations,
    (filterMigration) => (doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>) => {
      try {
        const attributes = migrateDataPersistedState(doc, filterMigration);

        return {
          ...doc,
          attributes,
        };
      } catch (e) {
        // Do not fail migration
        // Maps application can display error when saved object is viewed
        return doc;
      }
    }
  );
