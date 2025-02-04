/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregateOrder } from '@elastic/elasticsearch/lib/api/types';
import { kqlQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { unflattenKnownApmEventFields } from '@kbn/apm-data-access-plugin/server/utils';
import { asMutableArray } from '../../../../common/utils/as_mutable_array';
import {
  AT_TIMESTAMP,
  ERROR_CULPRIT,
  ERROR_EXC_HANDLED,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_TYPE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { getErrorName } from '../../../lib/helpers/get_error_name';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export type MobileErrorGroupMainStatisticsResponse = Array<{
  groupId: string;
  name: string;
  lastSeen: number;
  occurrences: number;
  culprit: string | undefined;
  handled: boolean | undefined;
  type: string | undefined;
}>;

export async function getMobileErrorGroupMainStatistics({
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
}): Promise<MobileErrorGroupMainStatisticsResponse> {
  // sort buckets by last occurrence of error
  const sortByLatestOccurrence = sortField === 'lastSeen';

  const maxTimestampAggKey = 'max_timestamp';

  const order: AggregationsAggregateOrder = sortByLatestOccurrence
    ? { [maxTimestampAggKey]: sortDirection }
    : { _count: sortDirection };

  const requiredFields = asMutableArray([ERROR_GROUP_ID, AT_TIMESTAMP] as const);

  const optionalFields = asMutableArray([
    ERROR_CULPRIT,
    ERROR_LOG_MESSAGE,
    ERROR_EXC_MESSAGE,
    ERROR_EXC_HANDLED,
    ERROR_EXC_TYPE,
  ] as const);

  const response = await apmEventClient.search('get_error_group_main_statistics', {
    apm: {
      events: [ProcessorEvent.error],
    },
    body: {
      track_total_hits: false,
      size: 0,
      query: {
        bool: {
          must_not: {
            term: { 'error.type': 'crash' },
          },
          filter: [
            ...termQuery(SERVICE_NAME, serviceName),
            ...termQuery(TRANSACTION_NAME, transactionName),
            ...termQuery(TRANSACTION_TYPE, transactionType),
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
            size: maxNumberOfErrorGroups,
            order,
          },
          aggs: {
            sample: {
              top_hits: {
                size: 1,
                fields: [...requiredFields, ...optionalFields],
                _source: [ERROR_LOG_MESSAGE, ERROR_EXC_MESSAGE, ERROR_EXC_HANDLED, ERROR_EXC_TYPE],
                sort: {
                  [AT_TIMESTAMP]: 'desc',
                },
              },
            },
            ...(sortByLatestOccurrence
              ? { [maxTimestampAggKey]: { max: { field: AT_TIMESTAMP } } }
              : {}),
          },
        },
      },
    },
  });

  return (
    response.aggregations?.error_groups.buckets.map((bucket) => {
      const errorSource =
        'error' in bucket.sample.hits.hits[0]._source
          ? bucket.sample.hits.hits[0]._source
          : undefined;

      const event = unflattenKnownApmEventFields(bucket.sample.hits.hits[0].fields, requiredFields);

      const mergedEvent = {
        ...event,
        error: {
          ...(event.error ?? {}),
          exception:
            (errorSource?.error.exception?.length ?? 0) > 0
              ? errorSource?.error.exception
              : event?.error.exception && [event.error.exception],
        },
      };

      return {
        groupId: event.error?.grouping_key,
        name: getErrorName(mergedEvent),
        lastSeen: new Date(mergedEvent[AT_TIMESTAMP]).getTime(),
        occurrences: bucket.doc_count,
        culprit: mergedEvent.error.culprit,
        handled: mergedEvent.error.exception?.[0].handled,
        type: mergedEvent.error.exception?.[0].type,
      };
    }) ?? []
  );
}
