/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObjectsType } from 'src/core/server';

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
};
