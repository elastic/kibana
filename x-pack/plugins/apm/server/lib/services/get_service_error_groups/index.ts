/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import { ValuesType } from 'utility-types';
import { kqlQuery, rangeQuery } from '../../../../../observability/server';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import {
  ERROR_EXC_MESSAGE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../../common/processor_event';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { withApmSpan } from '../../../utils/with_apm_span';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { getErrorName } from '../../helpers/get_error_name';
import { Setup } from '../../helpers/setup_request';

export type ServiceErrorGroupItem = ValuesType<
  PromiseReturnType<typeof getServiceErrorGroups>
>;

export async function getServiceErrorGroups({
  environment,
  kuery,
  serviceName,
  setup,
  size,
  numBuckets,
  pageIndex,
  sortDirection,
  sortField,
  transactionType,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  setup: Setup;
  size: number;
  pageIndex: number;
  numBuckets: number;
  sortDirection: 'asc' | 'desc';
  sortField: 'name' | 'lastSeen' | 'occurrences';
  transactionType: string;
  start: number;
  end: number;
}) {
  return withApmSpan('get_service_error_groups', async () => {
    const { apmEventClient } = setup;

    const { intervalString } = getBucketSize({ start, end, numBuckets });

    const response = await apmEventClient.search(
      'get_top_service_error_groups',
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
                { term: { [TRANSACTION_TYPE]: transactionType } },
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
                order: {
                  _count: 'desc',
                },
              },
              aggs: {
                sample: {
                  top_hits: {
                    size: 1,
                    _source: [
                      ERROR_LOG_MESSAGE,
                      ERROR_EXC_MESSAGE,
                      '@timestamp',
                    ] as any as string,
                    sort: {
                      '@timestamp': 'desc',
                    },
                  },
                },
              },
            },
          },
        },
      }
    );

    const errorGroups =
      response.aggregations?.error_groups.buckets.map((bucket) => ({
        group_id: bucket.key as string,
        name: getErrorName(bucket.sample.hits.hits[0]._source),
        lastSeen: new Date(
          bucket.sample.hits.hits[0]?._source['@timestamp']
        ).getTime(),
        occurrences: {
          value: bucket.doc_count,
        },
      })) ?? [];

    // Sort error groups first, and only get timeseries for data in view.
    // This is to limit the possibility of creating too many buckets.

    const sortedAndSlicedErrorGroups = orderBy(
      errorGroups,
      (group) => {
        if (sortField === 'occurrences') {
          return group.occurrences.value;
        }
        return group[sortField];
      },
      [sortDirection]
    ).slice(pageIndex * size, pageIndex * size + size);

    const sortedErrorGroupIds = sortedAndSlicedErrorGroups.map(
      (group) => group.group_id
    );

    const timeseriesResponse = await apmEventClient.search(
      'get_service_error_groups_timeseries',
      {
        apm: {
          events: [ProcessorEvent.error],
        },
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                { terms: { [ERROR_GROUP_ID]: sortedErrorGroupIds } },
                { term: { [SERVICE_NAME]: serviceName } },
                { term: { [TRANSACTION_TYPE]: transactionType } },
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
                size,
              },
              aggs: {
                timeseries: {
                  date_histogram: {
                    field: '@timestamp',
                    fixed_interval: intervalString,
                    min_doc_count: 0,
                    extended_bounds: {
                      min: start,
                      max: end,
                    },
                  },
                },
              },
            },
          },
        },
      }
    );

    return {
      total_error_groups: errorGroups.length,
      is_aggregation_accurate:
        (response.aggregations?.error_groups.sum_other_doc_count ?? 0) === 0,
      error_groups: sortedAndSlicedErrorGroups.map((errorGroup) => ({
        ...errorGroup,
        occurrences: {
          ...errorGroup.occurrences,
          timeseries:
            timeseriesResponse.aggregations?.error_groups.buckets
              .find((bucket) => bucket.key === errorGroup.group_id)
              ?.timeseries.buckets.map((dateBucket) => ({
                x: dateBucket.key,
                y: dateBucket.doc_count,
              })) ?? null,
        },
      })),
    };
  });
}
