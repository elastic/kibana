/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';
import { addNewIndexingStrategyIndexNames } from './migrations/7_9_0_add_new_indexing_strategy_index_names';

export const infraSourceConfigurationSavedObjectName = 'infrastructure-ui-source';

export const infraSourceConfigurationSavedObjectType: SavedObjectsType = {
  name: infraSourceConfigurationSavedObjectName,
  hidden: false,
  namespaceType: 'single',
  management: {
    importableAndExportable: true,
  },
  mappings: {
    properties: {
      name: {
        type: 'text',
      },
      description: {
        type: 'text',
      },
      metricAlias: {
        type: 'keyword',
      },
      logAlias: {
        type: 'keyword',
      },
      inventoryDefaultView: {
        type: 'keyword',
      },
      metricsExplorerDefaultView: {
        type: 'keyword',
      },
      fields: {
        properties: {
          container: {
            type: 'keyword',
          },
          host: {
            type: 'keyword',
          },
          pod: {
            type: 'keyword',
          },
          tiebreaker: {
            type: 'keyword',
          },
          timestamp: {
            type: 'keyword',
          },
        },
      },
      logColumns: {
        type: 'nested',
        properties: {
          timestampColumn: {
            properties: {
              id: {
                type: 'keyword',
              },
            },
          },
          messageColumn: {
            properties: {
              id: {
                type: 'keyword',
              },
            },
          },
          fieldColumn: {
            properties: {
              id: {
                type: 'keyword',
              },
              field: {
                type: 'keyword',
              },
            },
          },
        },
      },
    },
  },
  migrations: {
    '7.9.0': addNewIndexingStrategyIndexNames,
  },
};
