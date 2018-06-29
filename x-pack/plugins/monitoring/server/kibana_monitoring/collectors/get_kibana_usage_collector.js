/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, snakeCase } from 'lodash';
import { KIBANA_USAGE_TYPE } from '../../../common/constants';

const TYPES = [
  'dashboard',
  'visualization',
  'search',
  'index-pattern',
  'graph-workspace',
  'timelion-sheet',
];

/**
 * Fetches saved object counts by querying the .kibana index
 */
export function getKibanaUsageCollector(server) {
  const { UsageCollector } = server.usage;
  return new UsageCollector(server, {
    type: KIBANA_USAGE_TYPE,
    async fetch({ callCluster }) { // TODO use the saved object client here
      const index = server.config().get('kibana.index');
      const savedObjectCountSearchParams = {
        index,
        ignoreUnavailable: true,
        filterPath: 'aggregations.types.buckets',
        body: {
          size: 0,
          query: {
            terms: { type: TYPES },
          },
          aggs: {
            types: {
              terms: { field: 'type', size: TYPES.length }
            }
          }
        }
      };

      const resp = await callCluster('search', savedObjectCountSearchParams);
      const buckets = get(resp, 'aggregations.types.buckets', []);

      // get the doc_count from each bucket
      const bucketCounts = buckets.reduce((acc, bucket) => ({
        ...acc,
        [bucket.key]: bucket.doc_count,
      }), {});

      return {
        index,
        ...TYPES.reduce((acc, type) => ({ // combine the bucketCounts and 0s for types that don't have documents
          ...acc,
          [snakeCase(type)]: {
            total: bucketCounts[type] || 0
          }
        }), {})
      };
    }
  });
}
