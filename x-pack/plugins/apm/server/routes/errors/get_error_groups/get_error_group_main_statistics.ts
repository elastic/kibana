/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsTermsAggregationOrder } from '@elastic/elasticsearch/lib/api/types';
import { kqlQuery, rangeQuery } from '@kbn/observability-plugin/server';
import {
  ERROR_CULPRIT,
  ERROR_EXC_HANDLED,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { getErrorName } from '../../../lib/helpers/get_error_name';
import { Setup } from '../../../lib/helpers/setup_request';

export async function getErrorGroupMainStatistics({
  kuery,
  serviceName,
  setup,
  environment,
  sortField,
  sortDirection = 'desc',
  start,
  end,
}: {
  kuery: string;
  serviceName: string;
  setup: Setup;
  environment: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  // sort buckets by last occurrence of error
  const sortByLatestOccurrence = sortField === 'lastSeen';

  const maxTimestampAggKey = 'max_timestamp';

  const order: AggregationsTermsAggregationOrder = sortByLatestOccurrence
    ? { [maxTimestampAggKey]: sortDirection }
    : { _count: sortDirection };

  const response = await apmEventClient.search(
    'get_error_group_main_statistics',
    {
      apm: {
        events: [ProcessorEvent.error],
      },
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              { term: { [SERVICE_NAME]: serviceName } },
              ...rangeQuery(start, end),
              ...environmentQuery(environment),
              ...kqlQuery(kuery),
            ],
          },
        },
        aggs: {
          error_groups: {
            terms: {
              field: ERROR_GROUP_ID,
              size: 500,
              order,
            },
            aggs: {
              sample: {
                top_hits: {
                  size: 1,
                  _source: [
                    ERROR_LOG_MESSAGE,
                    ERROR_EXC_MESSAGE,
                    ERROR_EXC_HANDLED,
                    ERROR_EXC_TYPE,
                    ERROR_CULPRIT,
                    ERROR_GROUP_ID,
                    '@timestamp',
                  ],
                  sort: {
                    '@timestamp': 'desc',
                  },
                },
              },
              ...(sortByLatestOccurrence
                ? { [maxTimestampAggKey]: { max: { field: '@timestamp' } } }
                : {}),
            },
          },
        },
      },
    }
  );

  return (
    response.aggregations?.error_groups.buckets.map((bucket) => ({
      groupId: bucket.key as string,
      name: getErrorName(bucket.sample.hits.hits[0]._source),
      lastSeen: new Date(
        bucket.sample.hits.hits[0]?._source['@timestamp']
      ).getTime(),
      occurrences: bucket.doc_count,
      culprit: bucket.sample.hits.hits[0]?._source.error.culprit,
      handled: bucket.sample.hits.hits[0]?._source.error.exception?.[0].handled,
      type: bucket.sample.hits.hits[0]?._source.error.exception?.[0].type,
    })) ?? []
  );
}
