/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObjectsType } from 'src/core/server';

export const inventoryViewSavedObjectName = 'inventory-view';

export const inventoryViewSavedObjectType: SavedObjectsType = {
  name: inventoryViewSavedObjectName,
  hidden: false,
  namespaceType: 'single',
  management: {
    importableAndExportable: true,
  },
  mappings: {
    properties: {
      name: {
        type: 'keyword',
      },
      sort: {
        properties: {
          by: {
            type: 'keyword',
          },
          direction: {
            type: 'keyword',
          },
        },
      },
      metric: {
        properties: {
          type: {
            type: 'keyword',
          },
          field: {
            type: 'keyword',
          },
          aggregation: {
            type: 'keyword',
          },
          id: {
            type: 'keyword',
          },
          label: {
            type: 'keyword',
          },
        },
      },
      legend: {
        properties: {
          palette: {
            type: 'keyword',
          },
          steps: {
            type: 'long',
          },
          reverseColors: {
            type: 'boolean',
          },
        },
      },
      groupBy: {
        type: 'nested',
        properties: {
          label: {
            type: 'keyword',
          },
          field: {
            type: 'keyword',
          },
        },
      },
      nodeType: {
        type: 'keyword',
      },
      view: {
        type: 'keyword',
      },
      customOptions: {
        type: 'nested',
        properties: {
          text: {
            type: 'keyword',
          },
          field: {
            type: 'keyword',
          },
        },
      },
      customMetrics: {
        type: 'nested',
        properties: {
          type: {
            type: 'keyword',
          },
          field: {
            type: 'keyword',
          },
          aggregation: {
            type: 'keyword',
          },
          id: {
            type: 'keyword',
          },
          label: {
            type: 'keyword',
          },
        },
      },
      boundsOverride: {
        properties: {
          max: {
            type: 'integer',
          },
          min: {
            type: 'integer',
          },
        },
      },
      autoBounds: {
        type: 'boolean',
      },
      time: {
        type: 'long',
      },
      autoReload: {
        type: 'boolean',
      },
      filterQuery: {
        properties: {
          kind: {
            type: 'keyword',
          },
          expression: {
            type: 'keyword',
          },
        },
      },
      accountId: {
        type: 'keyword',
      },
      region: {
        type: 'keyword',
      },
    },
  },
};
