/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IRouter, Logger } from 'src/core/server';
import type { AggregationsMultiBucketAggregateBase } from '@elastic/elasticsearch/lib/api/types';
import { number, UnknownRecord } from 'io-ts';
import { transformError } from '@kbn/securitysolution-es-utils';

import type { BenchmarkStats, CloudPostureStats, Evaluation, Score } from '../../../common/types';
import {
  getBenchmarksQuery,
  getClustersQuery,
  getFindingsEsQuery,
  getLatestFindingQuery,
  getRisksEsQuery,
} from './stats_queries';
import { RULE_FAILED, RULE_PASSED } from '../../constants';
import { STATS_ROUTE_PATH } from '../../../common/constants';

// TODO: use a schema decoder
function assertBenchmarkStats(v: unknown): asserts v is BenchmarkStats {
  if (
    !UnknownRecord.is(v) ||
    !number.is(v.totalFindings) ||
    !number.is(v.totalPassed) ||
    !number.is(v.totalFailed) ||
    !number.is(v.postureScore)
  ) {
    throw new Error('missing stats');
  }
}

interface LastCycle {
  cycle_id: string;
}

interface KeyDocCount<TKey = string> {
  key: TKey;
  doc_count: number;
}

interface ResourceTypeBucket {
  resource_types: AggregationsMultiBucketAggregateBase<{
    key: string;
    doc_count: number;
    bucket_evaluation: AggregationsMultiBucketAggregateBase<KeyDocCount<Evaluation>>;
  }>;
}

interface ClusterQueryResult {
  key: string;
  doc_count: number;
  failed_findings: {
    doc_count: number;
  };
  passed_findings: {
    doc_count: number;
  };
  benchmark: AggregationsMultiBucketAggregateBase<KeyDocCount>;
}

interface AggsByClusterId {
  by_cluster_id: AggregationsMultiBucketAggregateBase<ClusterQueryResult>;
}

/**
 * @param value value is [0, 1] range
 */
export const roundScore = (value: number): Score => Number((value * 100).toFixed(1));

const calculatePostureScore = (total: number, passed: number, failed: number): Score | undefined =>
  passed + failed === 0 || total === undefined ? undefined : roundScore(passed / (passed + failed));

const getLatestCycleId = async (esClient: ElasticsearchClient) => {
  const latestFinding = await esClient.search<LastCycle>(getLatestFindingQuery());
  const lastCycle = latestFinding.body.hits.hits[0];

  if (lastCycle?._source?.cycle_id === undefined) {
    throw new Error('cycle id is missing');
  }
  return lastCycle?._source?.cycle_id;
};

export const getBenchmarks = async (esClient: ElasticsearchClient) => {
  const queryResult = await esClient.search<
    {},
    { benchmarks: AggregationsMultiBucketAggregateBase<Pick<KeyDocCount, 'key'>> }
  >(getBenchmarksQuery());
  const benchmarksBuckets = queryResult.body.aggregations?.benchmarks;

  if (!benchmarksBuckets || !Array.isArray(benchmarksBuckets?.buckets)) {
    throw new Error('missing buckets');
  }

  return benchmarksBuckets.buckets.map((e) => e.key);
};

export const getAllFindingsStats = async (
  esClient: ElasticsearchClient,
  cycleId: string
): Promise<BenchmarkStats> => {
  const [findings, passedFindings, failedFindings] = await Promise.all([
    esClient.count(getFindingsEsQuery(cycleId)),
    esClient.count(getFindingsEsQuery(cycleId, RULE_PASSED)),
    esClient.count(getFindingsEsQuery(cycleId, RULE_FAILED)),
  ]);

  const totalFindings = findings.body.count;
  const totalPassed = passedFindings.body.count;
  const totalFailed = failedFindings.body.count;
  const postureScore = calculatePostureScore(totalFindings, totalPassed, totalFailed);

  const stats = {
    name: 'general',
    postureScore,
    totalFindings,
    totalPassed,
    totalFailed,
  };

  assertBenchmarkStats(stats);

  return stats;
};

export const getBenchmarksStats = async (
  esClient: ElasticsearchClient,
  cycleId: string,
  benchmarks: string[]
): Promise<BenchmarkStats[]> => {
  const benchmarkPromises = benchmarks.map((benchmark) => {
    const benchmarkFindings = esClient.count(getFindingsEsQuery(cycleId, undefined, benchmark));
    const benchmarkPassedFindings = esClient.count(
      getFindingsEsQuery(cycleId, RULE_PASSED, benchmark)
    );
    const benchmarkFailedFindings = esClient.count(
      getFindingsEsQuery(cycleId, RULE_FAILED, benchmark)
    );

    return Promise.all([benchmarkFindings, benchmarkPassedFindings, benchmarkFailedFindings]).then(
      ([benchmarkFindingsResult, benchmarkPassedFindingsResult, benchmarkFailedFindingsResult]) => {
        const totalFindings = benchmarkFindingsResult.body.count;
        const totalPassed = benchmarkPassedFindingsResult.body.count;
        const totalFailed = benchmarkFailedFindingsResult.body.count;
        const postureScore = calculatePostureScore(totalFindings, totalPassed, totalFailed);

        const stats = {
          name: benchmark,
          postureScore,
          totalFindings,
          totalPassed,
          totalFailed,
        };

        assertBenchmarkStats(stats);
        return stats;
      }
    );
  });

  return Promise.all(benchmarkPromises);
};

export const getResourceTypesAggs = async (
  esClient: ElasticsearchClient,
  cycleId: string
): Promise<CloudPostureStats['resourceTypesAggs']> => {
  const resourceTypesQueryResult = await esClient.search<unknown, ResourceTypeBucket>(
    getRisksEsQuery(cycleId)
  );

  const resourceTypesAggs = resourceTypesQueryResult.body.aggregations?.resource_types.buckets;
  if (!Array.isArray(resourceTypesAggs)) throw new Error('missing resources types buckets');

  return resourceTypesAggs.map((bucket) => {
    const evalBuckets = bucket.bucket_evaluation.buckets;
    if (!Array.isArray(evalBuckets)) throw new Error('missing resources types evaluations buckets');

    const failedBucket = evalBuckets.find((evalBucket) => evalBucket.key === RULE_FAILED);
    const passedBucket = evalBuckets.find((evalBucket) => evalBucket.key === RULE_PASSED);

    return {
      resourceType: bucket.key,
      totalFindings: bucket.doc_count,
      totalFailed: failedBucket?.doc_count || 0,
      totalPassed: passedBucket?.doc_count || 0,
    };
  });
};

const getClusterAggs = async (
  esClient: ElasticsearchClient,
  cycleId: string
): Promise<CloudPostureStats['clusterAggs']> => {
  const queryResult = await esClient.search<unknown, AggsByClusterId>(getClustersQuery(cycleId));
  const clusters = queryResult.body.aggregations?.by_cluster_id.buckets;
  if (!Array.isArray(clusters)) throw new Error('missing aggregations by cluster id');

  return clusters.map((cluster) => {
    const benchmark = cluster.benchmark.buckets;
    if (!Array.isArray(benchmark)) {
      throw new Error('missing benchmark in aggregations by cluster id');
    }

    const failedFindings = cluster.failed_findings.doc_count;
    const passedFindings = cluster.passed_findings.doc_count;
    const totalFindings = failedFindings + passedFindings;
    const postureScore = calculatePostureScore(totalFindings, passedFindings, failedFindings);

    return {
      clusterId: cluster.key,
      benchmark: benchmark[0].key,
      failedFindings,
      passedFindings,
      totalFindings,
      postureScore,
    };
  });
};

export const defineGetStatsRoute = (router: IRouter, logger: Logger): void =>
  router.get(
    {
      path: STATS_ROUTE_PATH,
      validate: false,
    },
    async (context, _, response) => {
      try {
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const [benchmarks, latestCycleID] = await Promise.all([
          getBenchmarks(esClient),
          getLatestCycleId(esClient),
        ]);

        const [allFindingsStats, benchmarksStats, resourceTypesAggs, clusterAggs] =
          await Promise.all([
            getAllFindingsStats(esClient, latestCycleID),
            getBenchmarksStats(esClient, latestCycleID, benchmarks),
            getResourceTypesAggs(esClient, latestCycleID),
            getClusterAggs(esClient, latestCycleID),
          ]);

        const body: CloudPostureStats = {
          ...allFindingsStats,
          benchmarksStats,
          resourceTypesAggs,
          clusterAggs,
        };

        return response.ok({
          body,
        });
      } catch (err) {
        const error = transformError(err);

        return response.customError({
          body: { message: error.message },
          statusCode: error.statusCode,
        });
      }
    }
  );
