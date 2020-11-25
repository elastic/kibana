/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ValuesType } from 'utility-types';
import { orderBy } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { ProcessorEvent } from '../../../../common/processor_event';
import {
  ERROR_EXC_MESSAGE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { getErrorName } from '../../helpers/get_error_name';

export type ServiceErrorGroupItem = ValuesType<
  PromiseReturnType<typeof getServiceErrorGroups>
>;

export async function getServiceErrorGroups({
  serviceName,
  setup,
  size,
  numBuckets,
  pageIndex,
  sortDirection,
  sortField,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  size: number;
  pageIndex: number;
  numBuckets: number;
  sortDirection: 'asc' | 'desc';
  sortField: 'name' | 'last_seen' | 'occurrences';
}) {
  const { apmEventClient, start, end, esFilter } = setup;

  const { intervalString } = getBucketSize(start, end, numBuckets);

  const response = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.error],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { range: rangeFilter(start, end) },
            ...esFilter,
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
                _source: [ERROR_LOG_MESSAGE, ERROR_EXC_MESSAGE, '@timestamp'],
                sort: {
                  '@timestamp': 'desc',
                },
              },
            },
          },
        },
      },
    },
  });

  const errorGroups =
    response.aggregations?.error_groups.buckets.map((bucket) => ({
      group_id: bucket.key as string,
      name:
        getErrorName(bucket.sample.hits.hits[0]._source) ?? NOT_AVAILABLE_LABEL,
      last_seen: new Date(
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

  const timeseriesResponse = await apmEventClient.search({
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
            { range: rangeFilter(start, end) },
            ...esFilter,
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
  });

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
}
