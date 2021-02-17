/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeFilter } from '../../../../common/utils/range_filter';
import { ProcessorEvent } from '../../../../common/processor_event';
import {
  PROFILE_CPU_NS,
  PROFILE_ID,
  PROFILE_WALL_US,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { ProfilingValueType } from '../../../../common/profiling';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { getEnvironmentUiFilterES } from '../../helpers/convert_ui_filters/get_environment_ui_filter_es';

export async function getServiceProfilingTimeline({
  serviceName,
  environment,
  setup,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  environment?: string;
}) {
  const { apmEventClient, start, end, esFilter } = setup;

  const response = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.profile],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { range: rangeFilter(start, end) },
            ...getEnvironmentUiFilterES(environment),
            ...esFilter,
          ],
        },
      },
      aggs: {
        timeseries: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: getBucketSize({ start, end }).intervalString,
            min_doc_count: 0,
            extended_bounds: {
              min: start,
              max: end,
            },
          },
          aggs: {
            num_profiles: {
              cardinality: {
                field: PROFILE_ID,
              },
            },
            value_type: {
              filters: {
                filters: {
                  [ProfilingValueType.cpuTime]: {
                    exists: { field: PROFILE_CPU_NS },
                  },
                  [ProfilingValueType.wallTime]: {
                    exists: { field: PROFILE_WALL_US },
                  },
                },
              },
              aggs: {
                num_profiles: {
                  cardinality: {
                    field: PROFILE_ID,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  return aggregations.timeseries.buckets.map((bucket) => {
    return {
      x: bucket.key,
      count: bucket.num_profiles.value,
      valueTypes: {
        // TODO: use enum as object key. not possible right now
        // because of https://github.com/microsoft/TypeScript/issues/37888
        cpu_time: bucket.value_type.buckets.cpu_time.num_profiles.value,
        wall_time: bucket.value_type.buckets.wall_time.num_profiles.value,
      },
    };
  });
}
