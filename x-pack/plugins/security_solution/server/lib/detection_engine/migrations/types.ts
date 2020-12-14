/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Bucket {
  key: number;
  doc_count: number;
}

export interface MigrationStatus {
  name: string;
  version: number;
  signal_versions: Bucket[];
}

export interface MigrationDetails {
  destinationIndex: string;
  sourceIndex: string;
  taskId: string;
}

export interface MigrationStatusSearchResponse {
  aggregations: {
    signals_indices: {
      buckets: Array<{
        key: string;
        signal_versions: {
          buckets: Bucket[];
        };
      }>;
    };
  };
}

export interface IndexMappingsResponse {
  [indexName: string]: { mappings: { _meta: { version: number } } };
}
