/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const cspBenchmarkRuleSavedObjectMapping: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    metadata: {
      type: 'object',
      properties: {
        name: {
          type: 'keyword',
          fields: {
            text: {
              type: 'text',
            },
          },
        },
        id: {
          type: 'keyword',
        },
        section: {
          type: 'keyword',
          fields: {
            text: {
              type: 'text',
            },
          },
        },
        version: {
          type: 'keyword',
        },
        benchmark: {
          type: 'object',
          properties: {
            id: {
              // Needed for filtering rule templates by benchmark.id
              type: 'keyword',
            },
            name: {
              type: 'keyword',
            },
            posture_type: {
              type: 'keyword',
            },
            version: {
              type: 'keyword',
            },
            rule_number: {
              type: 'keyword',
            },
          },
        },
      },
    },
  },
};

export const cspSettingsSavedObjectMapping: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {},
};
