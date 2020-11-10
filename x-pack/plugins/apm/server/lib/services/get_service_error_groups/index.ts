/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ValuesType } from 'utility-types';
import { orderBy } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { PromiseReturnType } from '../../../../typings/common';
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
        timeseries: bucket.timeseries.buckets.map((dateBucket) => ({
          x: dateBucket.key as number,
          y: dateBucket.doc_count,
        })),
      },
    })) ?? [];

  const sortedErrorGroups = orderBy(
    errorGroups,
    (group) => {
      if (sortField === 'occurrences') {
        return group.occurrences.value;
      }
      return group[sortField];
    },
    [sortDirection]
  );

  const sliceFrom = pageIndex * size;

  return {
    total_error_groups: sortedErrorGroups.length,
    error_groups: sortedErrorGroups.slice(sliceFrom, sliceFrom + size),
  };
}
