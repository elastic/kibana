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
 * Fetches saved object client counts by querying the saved object index
 */
export function getUsageCollector(server, callCluster) {
  return {
    type: KIBANA_USAGE_TYPE,
    async fetch() {
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

        // combine the bucketCounts and 0s for types that don't have documents
        ...TYPES.reduce((acc, type) => ({
          ...acc,
          [snakeCase(type)]: {
            total: bucketCounts[type] || 0
          }
        }), {})
      };
    }
  };
}
