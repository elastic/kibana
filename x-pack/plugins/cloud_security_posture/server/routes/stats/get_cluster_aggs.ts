/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import {
  AggregationsMultiBucketAggregateBase as Aggregation,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import { CloudPostureStats } from '../../../common/types';
import {
  getResourceTypeFromAggs,
  resourceTypeAggQuery,
  ResourceTypeQueryResult,
} from './get_resource_type_aggs';
import { CSP_KUBEBEAT_INDEX_PATTERN } from '../../../common/constants';
import { calculatePostureScore } from './stats';

export interface KeyDocCount<TKey = string> {
  key: TKey;
  doc_count: number;
}

interface ClusterBucket extends ResourceTypeQueryResult, KeyDocCount {
  failed_findings: {
    doc_count: number;
  };
  passed_findings: {
    doc_count: number;
  };
  benchmarks: Aggregation<KeyDocCount>;
}

interface ClustersQueryResult {
  aggs_by_cluster_id: Aggregation<ClusterBucket>;
}

export const getClustersQuery = (cycleId: string): SearchRequest => ({
  index: CSP_KUBEBEAT_INDEX_PATTERN,
  size: 0,
  query: {
    match_all: {},
    // bool: {
    //   filter: [{ term: { 'cycle_id.keyword': cycleId } }],
    // },
  },
  aggs: {
    aggs_by_cluster_id: {
      terms: {
        field: 'cluster_id.keyword',
      },
      aggs: {
        failed_findings: {
          filter: { term: { 'result.evaluation.keyword': 'failed' } },
        },
        passed_findings: {
          filter: { term: { 'result.evaluation.keyword': 'passed' } },
        },
        benchmarks: {
          terms: {
            field: 'rule.benchmark.keyword',
          },
        },
        ...resourceTypeAggQuery,
      },
    },
  },
});

export const getClusterAggs = async (
  esClient: ElasticsearchClient,
  cycleId: string
): Promise<CloudPostureStats['clusterAggs']> => {
  const queryResult = await esClient.search<unknown, ClustersQueryResult>(
    getClustersQuery(cycleId)
  );
  const clusters = queryResult.body.aggregations?.aggs_by_cluster_id.buckets;
  if (!Array.isArray(clusters)) throw new Error('missing aggs by cluster id');

  return clusters.map((cluster) => {
    // get benchmark used by cluster
    const benchmarks = cluster.benchmarks.buckets;
    if (!Array.isArray(benchmarks)) throw new Error('missing aggs by benchmarks per cluster');

    const meta = {
      clusterId: cluster.key,
      benchmarkName: benchmarks[0].key,
    };

    // get cluster stats TODO: create shared function for stats calculations
    const failedFindings = cluster.failed_findings.doc_count;
    const passedFindings = cluster.passed_findings.doc_count;
    const totalFindings = failedFindings + passedFindings;
    const postureScore = calculatePostureScore(totalFindings, passedFindings, failedFindings);
    if (postureScore === undefined) throw new Error("couldn't calculate posture score");

    const stats = {
      totalFailed: failedFindings,
      totalPassed: passedFindings,
      totalFindings,
      postureScore,
    };

    // get cluster's resource types aggs
    const resourceTypes = cluster.aggs_by_resource_type.buckets;
    if (!Array.isArray(resourceTypes)) throw new Error('missing aggs by resource type per cluster');
    const resourceTypeAggs = getResourceTypeFromAggs(resourceTypes);

    return {
      meta,
      stats,
      resourceTypeAggs,
    };
  });
};
