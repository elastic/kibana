/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexMappingsResponse, MigrationStatusSearchResponse } from './types';

export const getMigrationStatusSearchResponse = (
  index: string = 'signals-index'
): MigrationStatusSearchResponse => ({
  aggregations: {
    signals_indices: {
      buckets: [
        {
          key: index,
          signal_versions: {
            buckets: [
              {
                key: -1,
                doc_count: 4,
              },
            ],
          },
        },
      ],
    },
  },
});

export const getIndexMappingsResponse = (
  index: string = 'signals-index'
): IndexMappingsResponse => ({
  [index]: { mappings: { _meta: { version: -1 } } },
});
