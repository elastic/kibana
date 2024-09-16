/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsModelVersionMap } from '@kbn/core-saved-objects-server';
import { rawRuleSchemaV1, rawRuleSchemaV2 } from '../schemas/raw_rule';

export const ruleModelVersions: SavedObjectsModelVersionMap = {
  '1': {
    changes: [],
    schemas: {
      create: rawRuleSchemaV1,
    },
  },
  '2': {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          'monitoring.run.last_run.metrics.gap_range.from': { type: 'date' },
          'monitoring.run.last_run.metrics.gap_range.to': { type: 'date' },
          'monitoring.run.last_run.metrics.gap_range': { type: 'object' },
        },
      },
    ],
    schemas: {
      create: rawRuleSchemaV2,
    },
  },
};
