/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { taskSchemaV1 } from '../schemas/task';

export const taskModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [
      {
        type: 'mappings_deprecation',
        deprecatedMappings: ['numSkippedRuns', 'interval'],
      },
    ],
    schemas: {
      create: taskSchemaV1,
    },
  },
};
