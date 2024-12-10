/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsServiceSetup } from '@kbn/core/server';

export const CLOUD_DATA_SAVED_OBJECT_TYPE = 'cloud' as const;

export function setupSavedObjects(savedObjects: SavedObjectsServiceSetup, logger: Logger) {
  savedObjects.registerType({
    name: CLOUD_DATA_SAVED_OBJECT_TYPE,
    hidden: true,
    hiddenFromHttpApis: true,
    namespaceType: 'agnostic',
    mappings: {
      dynamic: false,
      properties: {},
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: {},
  });
}
