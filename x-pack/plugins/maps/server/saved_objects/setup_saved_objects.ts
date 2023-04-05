/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import type { CoreSetup, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import type { SavedObjectMigrationMap } from '@kbn/core/server';
import { MigrateFunctionsObject } from '@kbn/kibana-utils-plugin/common';
import { mergeSavedObjectMigrationMaps } from '@kbn/core/server';
import { APP_ICON, getFullPath } from '../../common/constants';
import { migrateDataPersistedState } from '../../common/migrations/migrate_data_persisted_state';
import { migrateDataViewsPersistedState } from '../../common/migrations/migrate_data_view_persisted_state';
import type { MapSavedObjectAttributes } from '../../common/map_saved_object_type';
import { savedObjectMigrations } from './saved_object_migrations';

export function setupSavedObjects(
  core: CoreSetup,
  getFilterMigrations: () => MigrateFunctionsObject,
  getDataViewMigrations: () => MigrateFunctionsObject
) {
  core.savedObjects.registerType<MapSavedObjectAttributes>({
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
        mergeSavedObjectMigrationMaps(
          savedObjectMigrations,
          getMapsFilterMigrations(getFilterMigrations()) as unknown as SavedObjectMigrationMap
        ),
        getMapsDataViewMigrations(getDataViewMigrations())
      );
    },
  });
}

/**
 * This creates a migration map that applies external data plugin migrations to persisted filter state stored in Maps
 */
export const getMapsFilterMigrations = (
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

/**
 * This creates a migration map that applies external data view plugin migrations to persisted data view state stored in Maps
 */
export const getMapsDataViewMigrations = (
  migrations: MigrateFunctionsObject
): MigrateFunctionsObject =>
  mapValues(
    migrations,
    (migration) => (doc: SavedObjectUnsanitizedDoc<MapSavedObjectAttributes>) => {
      try {
        const attributes = migrateDataViewsPersistedState(doc, migration);

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
