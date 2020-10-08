/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from 'src/core/server';

import { REINDEX_OP_TYPE } from '../../common/types';

export const reindexOperationSavedObjectType: SavedObjectsType = {
  name: REINDEX_OP_TYPE,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      reindexTaskId: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      indexName: {
        type: 'keyword',
      },
      newIndexName: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      status: {
        type: 'integer',
      },
      locked: {
        type: 'date',
      },
      lastCompletedStep: {
        type: 'long',
      },
      // Note that reindex failures can result in extremely long error messages coming from ES.
      // We need to map these errors as text and use ignore_above to prevent indexing really large
      // messages as keyword. See https://github.com/elastic/kibana/issues/71642 for more info.
      errorMessage: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      reindexTaskPercComplete: {
        type: 'float',
      },
      runningReindexCount: {
        type: 'integer',
      },
      reindexOptions: {
        properties: {
          openAndClose: {
            type: 'boolean',
          },
          queueSettings: {
            properties: {
              queuedAt: {
                type: 'long',
              },
              startedAt: {
                type: 'long',
              },
            },
          },
        },
      },
    },
  },
};
