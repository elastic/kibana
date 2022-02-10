/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mapKeys, mapValues } from 'lodash';
import { ProcessorEvent } from '../../../../common/processor_event';
import {
  PROFILE_ID,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import {
  getValueTypeConfig,
  ProfilingValueType,
} from '../../../../common/profiling';
import { Setup } from '../../../lib/helpers/setup_request';
import { getBucketSize } from '../../../lib/helpers/get_bucket_size';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { kqlQuery, rangeQuery } from '../../../../../observability/server';

const configMap = mapValues(
  mapKeys(ProfilingValueType, (val, key) => val),
  (value) => getValueTypeConfig(value)
) as Record<ProfilingValueType, ReturnType<typeof getValueTypeConfig>>;

const allFields = Object.values(configMap).map((config) => config.field);

export async function getServiceProfilingTimeline({
  kuery,
  serviceName,
  environment,
  setup,
  start,
  end,
}: {
  kuery: string;
  serviceName: string;
  setup: Setup;
  environment: string;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;

  const response = await apmEventClient.search(
    'get_service_profiling_timeline',
    {
      apm: {
        events: [ProcessorEvent.profile],
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
              value_type: {
                filters: {
                  filters: {
                    unknown: {
                      bool: {
                        must_not: allFields.map((field) => ({
                          exists: { field },
                        })),
                      },
                    },
                    ...mapValues(configMap, ({ field }) => ({
                      exists: { field },
                    })),
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
    }
  );

  const { aggregations } = response;

  if (!aggregations) {
    return [];
  }

  return aggregations.timeseries.buckets.map((bucket) => {
    return {
      x: bucket.key,
      valueTypes: {
        unknown: bucket.value_type.buckets.unknown.num_profiles.value,
        // TODO: use enum as object key. not possible right now
        // because of https://github.com/microsoft/TypeScript/issues/37888
        ...mapValues(configMap, (_, key) => {
          return (
            bucket.value_type.buckets[key as ProfilingValueType]?.num_profiles
              .value ?? 0
          );
        }),
      },
    };
  });
}
