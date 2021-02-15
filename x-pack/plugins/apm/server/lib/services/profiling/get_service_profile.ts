/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ProcessorEvent } from '../../../../common/processor_event';
import { ESFilter } from '../../../../../../typings/elasticsearch';
import {
  PROFILE_CPU_NS,
  PROFILE_DURATION,
  PROFILE_ID,
  PROFILE_SAMPLES_COUNT,
  PROFILE_STACK,
  PROFILE_TOP_ID,
  PROFILE_WALL_US,
  SERVICE_NAME,
} from '../../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../../../common/utils/range_filter';
import { getEnvironmentUiFilterES } from '../../helpers/convert_ui_filters/get_environment_ui_filter_es';
import { APMEventClient } from '../../helpers/create_es_client/create_apm_event_client';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';

const MAX_STACK_IDS = 10000;
const MAX_PROFILE_IDS = 1000;

export interface ProfileNode {
  id: string;
  stats: {
    self: Record<string, number | null>;
    total: Record<string, number | null>;
  };
  parentId?: string;
}

async function getProfileStats({
  apmEventClient,
  filter,
}: {
  apmEventClient: APMEventClient;
  filter: ESFilter[];
}) {
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
        profiles: {
          terms: {
            field: PROFILE_ID,
            size: MAX_PROFILE_IDS,
          },
          aggs: {
            latest: {
              top_metrics: {
                metrics: [
                  { field: '@timestamp' },
                  { field: PROFILE_DURATION },
                ] as const,
                sort: {
                  '@timestamp': 'desc',
                },
              },
            },
          },
        },
        stacks: {
          terms: {
            field: PROFILE_TOP_ID,
            size: MAX_STACK_IDS,
          },
          aggs: {
            [PROFILE_CPU_NS]: {
              sum: {
                field: PROFILE_CPU_NS,
              },
            },
            [PROFILE_WALL_US]: {
              sum: {
                field: PROFILE_WALL_US,
              },
            },
            [PROFILE_SAMPLES_COUNT]: {
              sum: {
                field: PROFILE_SAMPLES_COUNT,
              },
            },
          },
        },
      },
    },
  });

  const profiles =
    response.aggregations?.profiles.buckets.map((profile) => {
      const latest = profile.latest.top[0].metrics ?? {};

      return {
        id: profile.key as string,
        duration: latest[PROFILE_DURATION] as number,
        timestamp: latest['@timestamp'] as number,
      };
    }) ?? [];

  const stacks =
    response.aggregations?.stacks.buckets.map((stack) => {
      return {
        id: stack.key as string,
        [PROFILE_CPU_NS]: stack[PROFILE_CPU_NS].value,
        [PROFILE_WALL_US]: stack[PROFILE_WALL_US].value,
        [PROFILE_SAMPLES_COUNT]: stack[PROFILE_SAMPLES_COUNT].value,
      };
    }) ?? [];

  return {
    profiles,
    stacks,
  };
}

async function getStacks({
  apmEventClient,
  filter,
}: {
  apmEventClient: APMEventClient;
  filter: ESFilter[];
}) {
  const response = await apmEventClient.search({
    apm: {
      events: [ProcessorEvent.profile],
    },
    body: {
      size: MAX_STACK_IDS,
      query: {
        bool: {
          filter,
        },
      },
      collapse: {
        field: PROFILE_TOP_ID,
      },
      _source: [PROFILE_TOP_ID, PROFILE_STACK],
    },
  });

  return response.hits.hits.map((hit) => hit._source);
}

export async function getServiceProfile({
  serviceName,
  setup,
  environment,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
  environment?: string;
}) {
  const { apmEventClient, start, end } = setup;

  const filter: ESFilter[] = [
    { range: rangeFilter(start, end) },
    { term: { [SERVICE_NAME]: serviceName } },
    ...getEnvironmentUiFilterES(environment),
  ];

  const [profileStats, stacks] = await Promise.all([
    getProfileStats({ apmEventClient, filter }),
    getStacks({ apmEventClient, filter }),
  ]);

  const nodes: Record<string, ProfileNode> = {};

  stacks.forEach((stack) => {
    const reversedStack = stack.profile.stack.concat().reverse();

    reversedStack.forEach((frame, index) => {
      let node = nodes[frame.id];
      if (!node) {
        node = nodes[frame.id] = {
          id: frame.id,
          stats: { self: {}, total: {} },
        };
      }

      if (index > 0) {
        node.parentId = nodes[reversedStack[index - 1].id].id;
      }
    });
  });

  profileStats.stacks.forEach((stackStats) => {
    const { id, ...stats } = stackStats;
    const node = nodes[id];
    if (nodes[id]) {
      Object.assign(nodes[id].stats.self, stats);
      let current: ProfileNode | undefined = node;
      while (current) {
        Object.keys(stats).forEach((statName) => {
          const totalVal = current!.stats.total[statName] || 0;
          current!.stats.total[statName] =
            totalVal + (stats[statName as keyof typeof stats] ?? 0);
        });
        current = current.parentId ? nodes[current.parentId] : undefined;
      }
    } else {
      // console.log('Could not find frame for', id);
    }
  });

  return {
    profiles: profileStats.profiles,
    nodes,
  };
}
