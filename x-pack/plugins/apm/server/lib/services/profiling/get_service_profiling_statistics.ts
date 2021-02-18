/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { keyBy, last } from 'lodash';
import { ProfileStackFrame } from '../../../../typings/es_schemas/ui/profile';
import { ProfilingValueType, ProfileNode } from '../../../../common/profiling';
import { ProcessorEvent } from '../../../../common/processor_event';
import { ESFilter } from '../../../../../../typings/elasticsearch';
import {
  PROFILE_CPU_NS,
  PROFILE_STACK,
  PROFILE_TOP_ID,
  PROFILE_WALL_US,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { rangeQuery, environmentQuery } from '../../../../common/utils/queries';
import { APMEventClient } from '../../helpers/create_es_client/create_apm_event_client';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { withApmSpan } from '../../../utils/with_apm_span';

const MAX_STACK_IDS = 10000;
const MAX_STACKS_PER_REQUEST = 1000;

const maybeAdd = (to: any[], value: any) => {
  if (to.includes(value)) {
    return;
  }

  to.push(value);
};

function getProfilingStats({
  apmEventClient,
  filter,
  valueTypeField,
}: {
  apmEventClient: APMEventClient;
  filter: ESFilter[];
  valueTypeField: string;
}) {
  return withApmSpan('get_profile_stats', async () => {
    const response = await apmEventClient.search({
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
          value: stack.value.value!,
        };
      }) ?? [];

    return stacks;
  });
}

function getProfilesWithStacks({
  apmEventClient,
  filter,
}: {
  apmEventClient: APMEventClient;
  filter: ESFilter[];
}) {
  return withApmSpan('get_profiles_with_stacks', async () => {
    const cardinalityResponse = await withApmSpan('get_top_cardinality', () =>
      apmEventClient.search({
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
      })
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
          const response = await withApmSpan('get_partition', () =>
            apmEventClient.search({
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
            })
          );

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

function getNodeLabelFromFrame(frame: ProfileStackFrame) {
  return [last(frame.function.split('/')), frame.line]
    .filter(Boolean)
    .join(':');
}

export async function getServiceProfilingStatistics({
  serviceName,
  setup,
  environment,
  valueType,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  environment?: string;
  valueType: ProfilingValueType;
}) {
  return withApmSpan('get_service_profiling_statistics', async () => {
    const { apmEventClient, start, end } = setup;

    const valueTypeField = {
      [ProfilingValueType.wallTime]: PROFILE_WALL_US,
      [ProfilingValueType.cpuTime]: PROFILE_CPU_NS,
    }[valueType];

    const filter: ESFilter[] = [
      ...rangeQuery(start, end),
      { term: { [SERVICE_NAME]: serviceName } },
      ...environmentQuery(environment),
      { exists: { field: valueTypeField } },
      ...setup.esFilter,
    ];

    const [profileStats, profileStacks] = await Promise.all([
      getProfilingStats({ apmEventClient, filter, valueTypeField }),
      getProfilesWithStacks({ apmEventClient, filter }),
    ]);

    const nodes: Record<string, ProfileNode> = {};
    const rootNodes: string[] = [];

    function getNode(frame: ProfileStackFrame) {
      const { id, filename, function: functionName, line } = frame;
      const location = [functionName, line].filter(Boolean).join(':');
      const fqn = [filename, location].filter(Boolean).join('/');
      const label = last(location.split('/'))!;
      let node = nodes[id];
      if (!node) {
        node = { id, label, fqn, value: 0, children: [] };
        nodes[id] = node;
      }
      return node;
    }

    const stackStatsById = keyBy(profileStats, 'id');

    profileStacks.forEach((profile) => {
      const stats = stackStatsById[profile.profile.top.id];
      const frames = profile.profile.stack.concat().reverse();

      frames.forEach((frame, index) => {
        const node = getNode(frame);

        if (index === frames.length - 1) {
          node.value += stats.value;
        }

        if (index === 0) {
          // root node
          maybeAdd(rootNodes, node.id);
        } else {
          const parent = nodes[frames[index - 1].id];
          maybeAdd(parent.children, node.id);
        }
      });
    });

    return {
      nodes,
      rootNodes,
    };
  });
}
