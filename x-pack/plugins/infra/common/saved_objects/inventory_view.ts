/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ElasticsearchMappingOf } from '../../server/utils/typed_elasticsearch_mappings';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { WaffleViewState } from '../../public/pages/inventory_view/hooks/use_waffle_view_state';

export const inventoryViewSavedObjectType = 'inventory-view';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedViewSavedObject } from '../../public/hooks/use_saved_view';

export const inventoryViewSavedObjectMappings: {
  [inventoryViewSavedObjectType]: ElasticsearchMappingOf<SavedViewSavedObject<WaffleViewState>>;
} = {
  [inventoryViewSavedObjectType]: {
    properties: {
      name: {
        type: 'keyword',
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
