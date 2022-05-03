/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsSingleBucketAggregateBase,
  AggregationsTopHitsAggregate,
  AggregationsRateAggregate,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { PackagePolicyServiceInterface } from '@kbn/fleet-plugin/server';
import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import {
  ListResult,
  PackagePolicy,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import { getRouteMetric } from '../routes/usage';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import { METRICS_INDICES } from './constants';
import { AgentInfo, BeatMetricsUsage, LiveQueryUsage } from './types';

interface PolicyLevelUsage {
  scheduled_queries?: ScheduledQueryUsageMetrics;
  agent_info?: AgentInfo;
}

export async function getPolicyLevelUsage(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  packagePolicyService?: PackagePolicyServiceInterface
): Promise<PolicyLevelUsage> {
  if (!packagePolicyService) {
    return {};
  }

  const packagePolicies = await packagePolicyService.list(soClient, {
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
    perPage: 10_000,
  });

  const result: PolicyLevelUsage = {
    scheduled_queries: getScheduledQueryUsage(packagePolicies),
    // TODO: figure out how to support dynamic keys in metrics
    // packageVersions: getPackageVersions(packagePolicies),
  };
  const agentResponse = await esClient.search<
    unknown,
    {
      policied: AggregationsSingleBucketAggregateBase;
    }
  >({
    body: {
      size: 0,
      query: {
        match: {
          active: true,
        },
      },
      aggs: {
        policied: {
          filter: {
            terms: {
              policy_id: packagePolicies.items.map((p) => p.policy_id),
            },
          },
        },
      },
    },
    index: '.fleet-agents',
    ignore_unavailable: true,
  });
  const policied = agentResponse.aggregations?.policied;
  if (policied && typeof policied.doc_count === 'number') {
    result.agent_info = {
      enrolled: policied.doc_count,
    };
  }

  return result;
}

export function getPackageVersions(packagePolicies: ListResult<PackagePolicy>) {
  return packagePolicies.items.reduce((acc, item) => {
    if (item.package) {
      acc[item.package.version] = (acc[item.package.version] ?? 0) + 1;
    }

    return acc;
  }, {} as { [version: string]: number });
}

interface ScheduledQueryUsageMetrics {
  queryGroups: {
    total: number;
    empty: number;
  };
}

export function getScheduledQueryUsage(packagePolicies: ListResult<PackagePolicy>) {
  return packagePolicies.items.reduce(
    (acc, item) => {
      ++acc.queryGroups.total;
      const policyAgents = item.inputs.reduce((sum, input) => sum + input.streams.length, 0);
      if (policyAgents === 0) {
        ++acc.queryGroups.empty;
      }

      return acc;
    },
    {
      queryGroups: {
        total: 0,
        empty: 0,
      },
    } as ScheduledQueryUsageMetrics
  );
}

export async function getLiveQueryUsage(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) {
  const metricResponse = await esClient.search<
    unknown,
    {
      queries: AggregationsSingleBucketAggregateBase;
    }
  >({
    body: {
      size: 0,
      aggs: {
        queries: {
          filter: {
            term: {
              input_type: 'osquery',
            },
          },
        },
      },
    },
    index: '.fleet-actions',
    ignore_unavailable: true,
  });
  const result: LiveQueryUsage = {
    session: await getRouteMetric(soClient, 'live_query'),
  };
  const esQueries = metricResponse.aggregations?.queries;
  if (esQueries && typeof esQueries.doc_count === 'number') {
    // getting error stats out of ES is difficult due to a lack of error info on .fleet-actions
    // and a lack of indexable osquery specific info on .fleet-actions-results
    result.cumulative = {
      queries: esQueries.doc_count,
    };
  }

  return result;
}

interface BeatUsageAggs {
  lastDay: {
    max_rss?: AggregationsRateAggregate;
    max_cpu?: AggregationsRateAggregate;
    latest?: AggregationsTopHitsAggregate;

    // not used in code, declared to satisfy type
    avg_rss?: AggregationsRateAggregate;
    avg_cpu?: AggregationsRateAggregate;
  };
}

export function extractBeatUsageMetrics(
  metricResponse: Pick<SearchResponse<unknown, BeatUsageAggs>, 'aggregations'>
) {
  const lastDayAggs = metricResponse.aggregations?.lastDay;
  const result: BeatMetricsUsage = {
    memory: {
      rss: {},
    },
    cpu: {},
  };

  if (lastDayAggs) {
    if (lastDayAggs.max_rss !== undefined) {
      result.memory.rss.max = lastDayAggs.max_rss.value;
    }

    if (lastDayAggs.avg_rss !== undefined) {
      // @ts-expect-error condition check another property, not idea why. consider fixing
      result.memory.rss.avg = lastDayAggs.max_rss.value;
    }

    if (lastDayAggs.max_cpu !== undefined) {
      result.cpu.max = lastDayAggs.max_cpu.value;
    }

    if (lastDayAggs.avg_cpu !== undefined) {
      // @ts-expect-error condition check another property, not idea why. consider fixing
      result.cpu.avg = lastDayAggs.max_cpu.value;
    }

    if (lastDayAggs.latest !== undefined) {
      const latest = lastDayAggs.latest.hits.hits[0]?._source?.monitoring.metrics.beat;
      if (latest) {
        result.cpu.latest = latest.cpu.total.time.ms;
        result.memory.rss.latest = latest.memstats.rss;
      }
    }
  }

  return result;
}

export async function getBeatUsage(esClient: ElasticsearchClient) {
  const metricResponse = await esClient.search<unknown, BeatUsageAggs>({
    body: {
      size: 0,
      aggs: {
        lastDay: {
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-24h',
                lte: 'now',
              },
            },
          },
          aggs: {
            latest: {
              top_hits: {
                sort: [
                  {
                    '@timestamp': {
                      order: 'desc',
                    },
                  },
                ],
                size: 1,
              },
            },
            max_rss: {
              max: {
                field: 'monitoring.metrics.beat.memstats.rss',
              },
            },
            avg_rss: {
              avg: {
                field: 'monitoring.metrics.beat.memstats.rss',
              },
            },
            max_cpu: {
              max: {
                field: 'monitoring.metrics.beat.cpu.total.time.ms',
              },
            },
            avg_cpu: {
              avg: {
                field: 'monitoring.metrics.beat.cpu.total.time.ms',
              },
            },
          },
        },
      },
    },
    index: METRICS_INDICES,
    ignore_unavailable: true,
  });

  return extractBeatUsageMetrics(metricResponse);
}
