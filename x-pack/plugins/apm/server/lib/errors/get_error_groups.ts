/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';
import { idx } from '@kbn/elastic-idx';
import {
  ERROR_CULPRIT,
  ERROR_EXC_HANDLED,
  ERROR_EXC_MESSAGE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  PROCESSOR_EVENT,
  SERVICE_NAME
} from '../../../common/elasticsearch_fieldnames';
import { PromiseReturnType } from '../../../typings/common';
import { APMError } from '../../../typings/es_schemas/ui/APMError';
import { rangeFilter } from '../helpers/range_filter';
import { Setup } from '../helpers/setup_request';

export type ErrorGroupListAPIResponse = PromiseReturnType<
  typeof getErrorGroups
>;

export async function getErrorGroups({
  serviceName,
  sortField,
  sortDirection = 'desc',
  setup
}: {
  serviceName: string;
  sortField: string;
  sortDirection: string;
  setup: Setup;
}) {
  const { start, end, uiFiltersES, client, config } = setup;

  const params: SearchParams = {
    index: config.get<string>('apm_oss.errorIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [PROCESSOR_EVENT]: 'error' } },
            { range: rangeFilter(start, end) },
            ...uiFiltersES
          ]
        }
      },
      aggs: {
        error_groups: {
          terms: {
            field: ERROR_GROUP_ID,
            size: 500,
            order: { _count: sortDirection }
          },
          aggs: {
            sample: {
              top_hits: {
                _source: [
                  ERROR_LOG_MESSAGE,
                  ERROR_EXC_MESSAGE,
                  ERROR_EXC_HANDLED,
                  ERROR_CULPRIT,
                  ERROR_GROUP_ID,
                  '@timestamp'
                ],
                sort: [{ '@timestamp': 'desc' }],
                size: 1
              }
            }
          }
        }
      }
    }
  };

  // sort buckets by last occurrence of error
  if (sortField === 'latestOccurrenceAt') {
    params.body.aggs.error_groups.terms.order = {
      max_timestamp: sortDirection
    };

    params.body.aggs.error_groups.aggs.max_timestamp = {
      max: { field: '@timestamp' }
    };
  }

  interface SampleError {
    '@timestamp': APMError['@timestamp'];
    error: {
      log?: {
        message: string;
      };
      exception?: Array<{
        handled?: boolean;
        message?: string;
      }>;
      culprit: APMError['error']['culprit'];
      grouping_key: APMError['error']['grouping_key'];
    };
  }

  interface Bucket {
    key: string;
    doc_count: number;
    sample: {
      hits: {
        total: number;
        max_score: number | null;
        hits: Array<{
          _source: SampleError;
        }>;
      };
    };
  }

  interface Aggs {
    error_groups: {
      buckets: Bucket[];
    };
  }

  const resp = await client.search<void, Aggs>(params);
  const buckets = idx(resp, _ => _.aggregations.error_groups.buckets) || [];

  const hits = buckets.map(bucket => {
    const source = bucket.sample.hits.hits[0]._source;
    const message =
      idx(source, _ => _.error.log.message) ||
      idx(source, _ => _.error.exception[0].message);

    return {
      message,
      occurrenceCount: bucket.doc_count,
      culprit: idx(source, _ => _.error.culprit),
      groupId: idx(source, _ => _.error.grouping_key),
      latestOccurrenceAt: source['@timestamp'],
      handled: idx(source, _ => _.error.exception[0].handled)
    };
  });

  return hits;
}
