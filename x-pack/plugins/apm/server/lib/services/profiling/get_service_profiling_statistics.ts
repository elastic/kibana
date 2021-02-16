/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { keyBy } from 'lodash';
import { ProfilingValueType, ProfileNode } from '../../../../common/profiling';
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
            value: {
              sum: {
                field: valueTypeField,
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
        value: stack.value.value!,
        count: stack[PROFILE_SAMPLES_COUNT].value!,
      };
    }) ?? [];

  return {
    profiles,
    stacks,
  };
}

async function getProfilesWithStacks({
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
  const { apmEventClient, start, end } = setup;

  const valueTypeField = {
    [ProfilingValueType.wallTime]: PROFILE_WALL_US,
    [ProfilingValueType.cpuTime]: PROFILE_CPU_NS,
  }[valueType];

  const filter: ESFilter[] = [
    { range: rangeFilter(start, end) },
    { term: { [SERVICE_NAME]: serviceName } },
    ...getEnvironmentUiFilterES(environment),
    { exists: { field: valueTypeField } },
  ];

  const [profileStats, profileStacks] = await Promise.all([
    getProfilingStats({ apmEventClient, filter, valueTypeField }),
    getProfilesWithStacks({ apmEventClient, filter }),
  ]);

  const nodes: Record<string, ProfileNode> = {};
  const rootNodes: string[] = [];

  function getNode({ id, name }: { id: string; name: string }) {
    let node = nodes[id];
    if (!node) {
      node = { id, name, value: 0, count: 0, children: [] };
      nodes[id] = node;
    }
    return node;
  }

  const stackStatsById = keyBy(profileStats.stacks, 'id');

  profileStacks.forEach((profile) => {
    const stats = stackStatsById[profile.profile.top.id];
    const frames = profile.profile.stack.concat().reverse();

    frames.forEach((frame, index) => {
      const node = getNode({ id: frame.id, name: frame.function });

      if (index === frames.length - 1) {
        node.value += stats.value;
        node.count += stats.count;
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
    profiles: profileStats.profiles,
    nodes,
    rootNodes,
  };
}
