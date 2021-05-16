/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { keyBy } from 'lodash';
import { Logger } from 'kibana/server';
import util from 'util';
import { maybe } from '../../../../common/utils/maybe';
import {
  ProfilingValueType,
  getValueTypeConfig,
} from '../../../../common/profiling';
import { ProcessorEvent } from '../../../../common/processor_event';
import { ESFilter } from '../../../../../../../src/core/types/elasticsearch';
import {
  PROFILE_STACK,
  PROFILE_TOP_ID,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import {
  rangeQuery,
  environmentQuery,
  kqlQuery,
} from '../../../../server/utils/queries';
import { APMEventClient } from '../../helpers/create_es_client/create_apm_event_client';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { withApmSpan } from '../../../utils/with_apm_span';
import { Collection } from './collection';

const MAX_STACK_IDS = 10000;
const MAX_STACKS_PER_REQUEST = 1000;

async function getProfilingStats({
  apmEventClient,
  filter,
  valueTypeField,
}: {
  apmEventClient: APMEventClient;
  filter: ESFilter[];
  valueTypeField: string;
}) {
  const response = await apmEventClient.search('get_profiling_stats', {
    apm: {
      events: [ProcessorEvent.profile],
    },
    body: {
      size: 0,
      query: {
        bool: {
          filter,
        },
      },
      aggs: {
        stacks: {
          terms: {
            field: PROFILE_TOP_ID,
            size: MAX_STACK_IDS,
            order: {
              value: 'desc',
            },
          },
          aggs: {
            value: {
              sum: {
                field: valueTypeField,
              },
            },
          },
        },
      },
    },
  });

  const stacks =
    response.aggregations?.stacks.buckets.map((stack) => {
      return {
        id: stack.key as string,
        self: stack.value.value!,
      };
    }) ?? [];

  return stacks;
}

function getProfilesWithStacks({
  apmEventClient,
  filter,
}: {
  apmEventClient: APMEventClient;
  filter: ESFilter[];
}) {
  return withApmSpan('get_profiles_with_stacks', async () => {
    const cardinalityResponse = await apmEventClient.search(
      'get_top_cardinality',
      {
        apm: {
          events: [ProcessorEvent.profile],
        },
        body: {
          size: 0,
          query: {
            bool: { filter },
          },
          aggs: {
            top: {
              cardinality: {
                field: PROFILE_TOP_ID,
              },
            },
          },
        },
      }
    );

    const cardinality = cardinalityResponse.aggregations?.top.value ?? 0;

    const numStacksToFetch = Math.min(
      Math.ceil(cardinality * 1.1),
      MAX_STACK_IDS
    );

    const partitions = Math.ceil(numStacksToFetch / MAX_STACKS_PER_REQUEST);

    if (partitions === 0) {
      return [];
    }

    const allResponses = await withApmSpan('get_all_stacks', async () => {
      return Promise.all(
        [...new Array(partitions)].map(async (_, num) => {
          const response = await apmEventClient.search('get_partition', {
            apm: {
              events: [ProcessorEvent.profile],
            },
            body: {
              query: {
                bool: {
                  filter,
                },
              },
              aggs: {
                top: {
                  terms: {
                    field: PROFILE_TOP_ID,
                    size: Math.max(MAX_STACKS_PER_REQUEST),
                    include: {
                      num_partitions: partitions,
                      partition: num,
                    },
                  },
                  aggs: {
                    latest: {
                      top_hits: {
                        _source: [PROFILE_TOP_ID, PROFILE_STACK],
                      },
                    },
                  },
                },
              },
            },
          });

          return (
            response.aggregations?.top.buckets.flatMap((bucket) => {
              return bucket.latest.hits.hits[0]._source;
            }) ?? []
          );
        })
      );
    });

    return allResponses.flat();
  });
}

export async function getServiceProfilingStatistics({
  kuery,
  serviceName,
  setup,
  environment,
  valueType,
  logger,
}: {
  kuery?: string;
  serviceName: string;
  setup: Setup & SetupTimeRange;
  environment?: string;
  valueType: ProfilingValueType;
  logger: Logger;
}) {
  return withApmSpan('get_service_profiling_statistics', async () => {
    const { apmEventClient, start, end } = setup;

    const valueTypeField = getValueTypeConfig(valueType).field;

    const filter: ESFilter[] = [
      { term: { [SERVICE_NAME]: serviceName } },
      { exists: { field: valueTypeField } },
      ...rangeQuery(start, end),
      ...environmentQuery(environment),
      ...kqlQuery(kuery),
    ];

    const [profileStats, profileStacks] = await Promise.all([
      getProfilingStats({ apmEventClient, filter, valueTypeField }),
      getProfilesWithStacks({ apmEventClient, filter }),
    ]);

    const missingSamples: string[] = [];

    const stackStatsById = keyBy(profileStats, 'id');

    const locations = new Collection<{
      filename?: string;
      line?: string;
      function: string;
    }>();
    const frames = new Collection<number>();

    const samples: Array<{
      value: number;
      frames: number[];
    }> = [];

    profileStacks.forEach((profile, i) => {
      const sample = maybe(stackStatsById[profile.profile.top.id]);
      if (!sample) {
        missingSamples.push(profile.profile.top.id);
        return;
      }

      samples.push({
        value: sample.self,
        frames: profile.profile.stack.map((frame) => {
          const location = locations.set(frame, frame.id);

          return frames.set(location);
        }),
      });
    });

    if (missingSamples.length > 0) {
      logger.warn(
        `Could not find samples for all stacks: ${util.inspect({
          numProfileStats: profileStats.length,
          numStacks: profileStacks.length,
          missing: missingSamples,
        })}`
      );
    }

    return {
      locations: locations.values(),
      frames: frames.values(),
      samples,
    };
  });
}
