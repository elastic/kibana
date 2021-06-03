/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SingleBucketAggregate,
  TopHitsAggregate,
  ValueAggregate,
} from '@elastic/elasticsearch/api/types';
import { PackagePolicyServiceInterface } from '../../../fleet/server';
import { getRouteMetric } from '../routes/usage';
import { ElasticsearchClient, SavedObjectsClientContract } from '../../../../../src/core/server';
import { ListResult, PackagePolicy, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../fleet/common';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import { METRICS_INDICES } from './constants';

export interface MetricEntry {
  max?: number;
  latest?: number;
  avg?: number;
}

export interface BeatMetricAggregation {
  rss: MetricEntry;
  cpuMs: MetricEntry;
}

interface PolicyLevelUsage {
  scheduled_queries?: {};
  agent_info?: {};
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
  const agentResponse = await esClient.search({
    body: {
      size: 0,
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
  });
  if (agentResponse.statusCode === 200) {
    result.agent_info = {
      enrolled: (agentResponse.body.aggregations?.policied as SingleBucketAggregate).doc_count,
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
      if (item.inputs.length === 0) {
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
  const { body: metricResponse } = await esClient.search({
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
  });
  const esQueries = (metricResponse.aggregations?.queries as SingleBucketAggregate).doc_count;
  const result = {
    session: await getRouteMetric(soClient, 'live_query'),
    // getting error stats out of ES is difficult due to a lack of error info on .fleet-actions
    // and a lack of indexable osquery specific info on .fleet-actions-results
    cumulative: {
      queries: esQueries,
    },
  };

  return result;
}

export async function getBeatUsage(esClient: ElasticsearchClient) {
  // ???: currently cpu is recorded as a duration rather than a load %. this might make it difficult to reason about the metrics in parallel systems.
  // ???: these metrics would be more actionable with some facets of them (e.g. platform, architecture, etc)
  const { body: metricResponse } = await esClient.search({
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
  });
  const lastDayAggs = metricResponse.aggregations?.lastDay as SingleBucketAggregate;
  const result: BeatMetricAggregation = {
    rss: {},
    cpuMs: {},
  };

  if ('max_rss' in lastDayAggs) {
    result.rss.max = (lastDayAggs.max_rss as ValueAggregate).value;
  }

  if ('avg_rss' in lastDayAggs) {
    result.rss.avg = (lastDayAggs.max_rss as ValueAggregate).value;
  }

  if ('max_cpu' in lastDayAggs) {
    result.cpuMs.max = (lastDayAggs.max_cpu as ValueAggregate).value;
  }

  if ('avg_cpu' in lastDayAggs) {
    result.cpuMs.avg = (lastDayAggs.max_cpu as ValueAggregate).value;
  }

  if ('latest' in lastDayAggs) {
    const latest = (lastDayAggs.latest as TopHitsAggregate).hits.hits[0]?._source?.monitoring
      .metrics.beat;
    result.cpuMs.latest = latest.cpu.total.time.ms;
    result.rss.latest = latest.memstats.rss;
  }

  return result;
}
