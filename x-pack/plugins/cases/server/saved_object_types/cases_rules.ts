/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import { CASE_RULES_SAVED_OBJECT } from '../../common/constants';

export const casesRulesSavedObjectType: SavedObjectsType = {
  name: CASE_RULES_SAVED_OBJECT,
  indexPattern: ALERTING_CASES_SAVED_OBJECT_INDEX,
  hidden: true,
  /**
   * TODO: Verify
   */
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      counter: {
        type: 'unsigned_long',
      },
      createdAt: {
        type: 'date',
      },
      /*
      grouping: {
        type: 'flattened',
      },
      */
      rules: {
        properties: {
          id: {
            type: 'keyword',
          },
        },
      },
      updatedAt: {
        type: 'date',
      },
    },
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        create: schema.object({
          counter: schema.number(),
          createdAt: schema.string(),
          grouping: schema.recordOf(schema.string(), schema.any()),
          rules: schema.arrayOf(schema.object({ id: schema.string() })),
          updatedAt: schema.nullable(schema.string()),
        }),
      },
    },
  },
};
