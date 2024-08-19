/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';

export const timelineESQLOptionsMapping = {
  esqlOptions: {
    properties: {
      query: {
        type: 'text',
      },
      sort: {
        dynamic: false,
        properties: {
          columnId: {
            type: 'keyword',
          },
          columnType: {
            type: 'keyword',
          },
          sortDirection: {
            type: 'keyword',
          },
        },
      },
    },
  },
} as const;

export const timelineSOVersionAddEsqlOptionsMapping: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: timelineESQLOptionsMapping,
    },
  ],
};
