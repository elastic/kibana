/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SERVICE_NAME,
  ERROR_GROUP_ID,
  ERROR_CULPRIT,
  ERROR_EXC_MESSAGE,
  ERROR_LOG_MESSAGE,
  ERROR_EXC_HANDLED,
  PROCESSOR_EVENT
} from '../../../common/constants';
import { get } from 'lodash';

export async function getErrorGroups({
  serviceName,
  q,
  sortBy,
  sortOrder = 'desc',
  setup
}) {
  const { start, end, client, config } = setup;

  const params = {
    index: config.get('xpack.apm.indexPattern'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [PROCESSOR_EVENT]: 'error' } },
            {
              range: {
                '@timestamp': {
                  gte: start,
                  lte: end,
                  format: 'epoch_millis'
                }
              }
            }
          ]
        }
      },
      aggs: {
        error_groups: {
          terms: {
            field: ERROR_GROUP_ID,
            size: 500,
            order: { _count: sortOrder }
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

  // sort buckets by last occurence of error
  if (sortBy === 'latestOccurrenceAt') {
    params.body.aggs.error_groups.terms.order = {
      max_timestamp: sortOrder
    };

    params.body.aggs.error_groups.aggs.max_timestamp = {
      max: { field: '@timestamp' }
    };
  }

  // match query against error fields
  if (q) {
    params.body.query.bool.must = [
      {
        simple_query_string: {
          fields: [
            ERROR_EXC_MESSAGE,
            ERROR_LOG_MESSAGE,
            ERROR_CULPRIT,
            ERROR_GROUP_ID
          ],
          query: q
        }
      }
    ];
  }

  const resp = await client('search', params);
  const hits = get(resp, 'aggregations.error_groups.buckets', []).map(
    bucket => {
      const source = bucket.sample.hits.hits[0]._source;
      const message =
        get(source, ERROR_LOG_MESSAGE) || get(source, ERROR_EXC_MESSAGE);

      return {
        message,
        occurrenceCount: bucket.doc_count,
        culprit: get(source, ERROR_CULPRIT),
        groupId: get(source, ERROR_GROUP_ID),
        latestOccurrenceAt: source['@timestamp'],
        handled: get(source, ERROR_EXC_HANDLED)
      };
    }
  );

  return hits;
}
