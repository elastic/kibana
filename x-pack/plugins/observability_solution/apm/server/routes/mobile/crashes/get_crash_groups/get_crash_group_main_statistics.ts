/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsAggregateOrder } from '@elastic/elasticsearch/lib/api/types';
import { kqlQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  ERROR_CULPRIT,
  ERROR_TYPE,
  ERROR_EXC_HANDLED,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { getErrorName } from '../../../../lib/helpers/get_error_name';
import { APMEventClient } from '../../../../lib/helpers/create_es_client/create_apm_event_client';

export type MobileCrashGroupMainStatisticsResponse = Array<{
  groupId: string;
  name: string;
  lastSeen: number;
  occurrences: number;
  culprit: string | undefined;
  handled: boolean | undefined;
  type: string | undefined;
}>;

export async function getMobileCrashGroupMainStatistics({
  kuery,
  serviceName,
  apmEventClient,
  environment,
  sortField,
  sortDirection = 'desc',
  start,
  end,
  maxNumberOfErrorGroups = 500,
  transactionName,
  transactionType,
}: {
  kuery: string;
  serviceName: string;
  apmEventClient: APMEventClient;
  environment: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  start: number;
  end: number;
  maxNumberOfErrorGroups?: number;
  transactionName?: string;
  transactionType?: string;
}): Promise<MobileCrashGroupMainStatisticsResponse> {
  // sort buckets by last occurrence of error
  const sortByLatestOccurrence = sortField === 'lastSeen';

  const maxTimestampAggKey = 'max_timestamp';

  const order: AggregationsAggregateOrder = sortByLatestOccurrence
    ? { [maxTimestampAggKey]: sortDirection }
    : { _count: sortDirection };

  const response = await apmEventClient.search('get_crash_group_main_statistics', {
    apm: {
      events: [ProcessorEvent.error],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(TRANSACTION_NAME, transactionName),
            ...termQuery(TRANSACTION_TYPE, transactionType),
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...termQuery(ERROR_TYPE, 'crash'),
            ...kqlQuery(kuery),
          ],
        },
      },
      aggs: {
        crash_groups: {
          terms: {
            field: ERROR_GROUP_ID,
            size: maxNumberOfErrorGroups,
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
  });

  return (
    response.aggregations?.crash_groups.buckets.map((bucket) => ({
      groupId: bucket.key as string,
      name: getErrorName(bucket.sample.hits.hits[0]._source),
      lastSeen: new Date(bucket.sample.hits.hits[0]?._source['@timestamp']).getTime(),
      occurrences: bucket.doc_count,
      culprit: bucket.sample.hits.hits[0]?._source.error.culprit,
      handled: bucket.sample.hits.hits[0]?._source.error.exception?.[0].handled,
      type: bucket.sample.hits.hits[0]?._source.error.exception?.[0].type,
    })) ?? []
  );
}
