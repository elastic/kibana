/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTypeMappingDefinition } from '@kbn/core/server';

export const rulesSettingsMappings: SavedObjectsTypeMappingDefinition = {
  properties: {
    flapping: {
      properties: {
        enabled: {
          type: 'boolean',
        },
        lookBackWindow: {
          type: 'long',
        },
        statusChangeThreshold: {
          type: 'long',
        },
        createdBy: {
          type: 'keyword',
        },
        updatedBy: {
          type: 'keyword',
        },
        createdAt: {
          type: 'date',
        },
        updatedAt: {
          type: 'date',
        },
      },
    },
  },
};
