/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import type {
  AggregationsMultiBucketAggregateBase as Aggregation,
  QueryDslQueryContainer,
  SearchRequest,
  AggregationsTopHitsAggregate,
  SearchHit,
} from '@elastic/elasticsearch/lib/api/types';
import { CspFinding } from '../../../common/schemas/csp_finding';
import type { Cluster } from '../../../common/types';
import {
  getFailedFindingsFromAggs,
  failedFindingsAggQuery,
} from './get_grouped_findings_evaluation';
import type { FailedFindingsQueryResult } from './get_grouped_findings_evaluation';
import { findingsEvaluationAggsQuery, getStatsFromFindingsEvaluationsAggs } from './get_stats';
import { KeyDocCount } from './compliance_dashboard';

export interface ClusterBucket extends FailedFindingsQueryResult, KeyDocCount {
  failed_findings: {
    doc_count: number;
  };
  passed_findings: {
    doc_count: number;
  };
  latestFindingTopHit: AggregationsTopHitsAggregate;
}

interface ClustersQueryResult {
  aggs_by_cluster_id: Aggregation<ClusterBucket>;
}

export type ClusterWithoutTrend = Omit<Cluster, 'trend'>;

export const getClustersQuery = (query: QueryDslQueryContainer, pitId: string): SearchRequest => ({
  size: 0,
  query,
  aggs: {
    aggs_by_cluster_id: {
      terms: {
        field: 'cluster_id',
      },
      aggs: {
        latestFindingTopHit: {
          top_hits: {
            size: 1,
            sort: [{ '@timestamp': { order: 'desc' } }],
          },
        },
        ...failedFindingsAggQuery,
        ...findingsEvaluationAggsQuery,
      },
    },
  },
  pit: {
    id: pitId,
  },
});

export const getClustersFromAggs = (clusters: ClusterBucket[]): ClusterWithoutTrend[] =>
  clusters.map((cluster) => {
    const latestFindingHit: SearchHit<CspFinding> = cluster.latestFindingTopHit.hits.hits[0];
    if (!latestFindingHit._source) throw new Error('Missing findings top hits');

    const meta = {
      clusterId: cluster.key,
      clusterName: latestFindingHit._source.orchestrator?.cluster?.name,
      benchmarkName: latestFindingHit._source.rule.benchmark.name,
      benchmarkId: latestFindingHit._source.rule.benchmark.id,
      lastUpdate: latestFindingHit._source['@timestamp'],
    };

    // get cluster's stats
    if (!cluster.failed_findings || !cluster.passed_findings)
      throw new Error('missing findings evaluations per cluster');
    const stats = getStatsFromFindingsEvaluationsAggs(cluster);

    // get cluster's resource types aggs
    const resourcesTypesAggs = cluster.aggs_by_resource_type.buckets;
    if (!Array.isArray(resourcesTypesAggs))
      throw new Error('missing aggs by resource type per cluster');
    const groupedFindingsEvaluation = getFailedFindingsFromAggs(resourcesTypesAggs);

    return {
      meta,
      stats,
      groupedFindingsEvaluation,
    };
  });

export const getClusters = async (
  esClient: ElasticsearchClient,
  query: QueryDslQueryContainer,
  pitId: string
): Promise<ClusterWithoutTrend[]> => {
  const queryResult = await esClient.search<unknown, ClustersQueryResult>(
    getClustersQuery(query, pitId)
  );

  const clusters = queryResult.aggregations?.aggs_by_cluster_id.buckets;
  if (!Array.isArray(clusters)) throw new Error('missing aggs by cluster id');

  return getClustersFromAggs(clusters);
};
