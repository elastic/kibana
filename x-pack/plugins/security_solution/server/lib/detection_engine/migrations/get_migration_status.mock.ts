/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexMappingsResponse, MigrationStatusSearchResponse } from './types';

export const getMigrationStatusSearchResponseMock = (
  indices: string[] = ['signals-index'],
  signalVersions: number[] = [-1]
): MigrationStatusSearchResponse => ({
  aggregations: {
    signals_indices: {
      buckets: indices.map((index) => ({
        key: index,
        signal_versions: {
          buckets: signalVersions.map((version) => ({
            key: version,
            doc_count: 4,
          })),
        },
      })),
    },
  },
});

export const getIndexMappingsResponseMock = (
  index: string = 'signals-index'
): IndexMappingsResponse => ({
  [index]: { mappings: { _meta: { version: -1 } } },
});
