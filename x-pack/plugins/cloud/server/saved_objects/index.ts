/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsServiceSetup } from '@kbn/core/server';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { cloudDataModelVersions } from './model_versions';

export const CLOUD_DATA_SAVED_OBJECT_TYPE = 'cloud_data';

export function setupSavedObjects(savedObjects: SavedObjectsServiceSetup, logger: Logger) {
  savedObjects.registerType({
    name: CLOUD_DATA_SAVED_OBJECT_TYPE,
    indexPattern: MAIN_SAVED_OBJECT_INDEX,
    hidden: true,
    namespaceType: 'multiple-isolated',
    mappings: {
      dynamic: false,
      properties: {
        onboarding: {
          // NO NEED TO BE INDEXED
          // properties: {
          //   token: {
          //     type: 'keyword',
          //   },
          //   solution_type: {
          //     type: 'keyword',
          //   },
          // },
        },
      },
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: cloudDataModelVersions,
  });
}
