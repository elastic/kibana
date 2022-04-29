/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { keyBy, last } from 'lodash';
import { Logger } from '@kbn/core/server';
import util from 'util';
import { ESFilter } from '@kbn/core/types/elasticsearch';
import { rangeQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { maybe } from '../../../../common/utils/maybe';
import { ProfileStackFrame } from '../../../../typings/es_schemas/ui/profile';
import {
  ProfilingValueType,
  ProfileNode,
  getValueTypeConfig,
} from '../../../../common/profiling';
import { ProcessorEvent } from '../../../../common/processor_event';
import {
  PROFILE_STACK,
  PROFILE_TOP_ID,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { Setup } from '../../../lib/helpers/setup_request';
import { withApmSpan } from '../../../utils/with_apm_span';

const MAX_STACK_IDS = 10000;
const MAX_STACKS_PER_REQUEST = 1000;

const maybeAdd = (to: any[], value: any) => {
  if (to.includes(value)) {
    return;
  }

  to.push(value);
};

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
        value: stack.value.value!,
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
              size: 0,
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
  start,
  end,
}: {
  kuery: string;
  serviceName: string;
  setup: Setup;
  environment: string;
  valueType: ProfilingValueType;
  logger: Logger;
  start: number;
  end: number;
}) {
  return withApmSpan('get_service_profiling_statistics', async () => {
    const { apmEventClient } = setup;

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

    const missingStacks: string[] = [];

    profileStacks.forEach((profile) => {
      const stats = maybe(stackStatsById[profile.profile.top.id]);

      if (!stats) {
        missingStacks.push(profile.profile.top.id);
        return;
      }

      const frames = profile.profile.stack.concat().reverse();

      frames.forEach((frame, index) => {
        const node = getNode(frame);

        if (index === frames.length - 1 && stats) {
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

    if (missingStacks.length > 0) {
      logger.warn(
        `Could not find stats for all stacks: ${util.inspect({
          numProfileStats: profileStats.length,
          numStacks: profileStacks.length,
          missing: missingStacks,
        })}`
      );
    }

    return {
      nodes,
      rootNodes,
    };
  });
}
