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

interface GroupFilename {
  // TODO find the 'key', 'doc_count' interface
  key: string;
  doc_count: number;
}

interface ResourceTypeBucket {
  resource_types: AggregationsMultiBucketAggregateBase<{
    key: string;
    doc_count: number;
    bucket_evaluation: AggregationsMultiBucketAggregateBase<ResourceTypeEvaluationBucket>;
  }>;
}

interface ResourceTypeEvaluationBucket {
  key: Evaluation;
  doc_count: number;
}

/**
 * @param value value is [0, 1] range
 */
export const roundScore = (value: number): Score => Number((value * 100).toFixed(1));

const calculatePostureScore = (total: number, passed: number, failed: number): Score | undefined =>
  passed + failed === 0 || total === undefined ? undefined : roundScore(passed / (passed + failed));

const getLatestCycleId = async (esClient: ElasticsearchClient) => {
  const latestFinding = await esClient.search<LastCycle>(getLatestFindingQuery(), { meta: true });
  const lastCycle = latestFinding.body.hits.hits[0];

  if (lastCycle?._source?.cycle_id === undefined) {
    throw new Error('cycle id is missing');
  }
  return lastCycle?._source?.cycle_id;
};

export const getBenchmarks = async (esClient: ElasticsearchClient) => {
  const queryResult = await esClient.search<
    {},
    { benchmarks: AggregationsMultiBucketAggregateBase<Pick<GroupFilename, 'key'>> }
  >(getBenchmarksQuery(), { meta: true });
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
    esClient.count(getFindingsEsQuery(cycleId), { meta: true }),
    esClient.count(getFindingsEsQuery(cycleId, RULE_PASSED), { meta: true }),
    esClient.count(getFindingsEsQuery(cycleId, RULE_FAILED), { meta: true }),
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
    const benchmarkFindings = esClient.count(getFindingsEsQuery(cycleId, undefined, benchmark), {
      meta: true,
    });
    const benchmarkPassedFindings = esClient.count(
      getFindingsEsQuery(cycleId, RULE_PASSED, benchmark),
      { meta: true }
    );
    const benchmarkFailedFindings = esClient.count(
      getFindingsEsQuery(cycleId, RULE_FAILED, benchmark),
      { meta: true }
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
    getRisksEsQuery(cycleId),
    { meta: true }
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

        // TODO: Utilize ES "Point in Time" feature https://www.elastic.co/guide/en/elasticsearch/reference/current/point-in-time-api.html
        const [allFindingsStats, benchmarksStats, resourceTypesAggs] = await Promise.all([
          getAllFindingsStats(esClient, latestCycleID),
          getBenchmarksStats(esClient, latestCycleID, benchmarks),
          getResourceTypesAggs(esClient, latestCycleID),
        ]);

        const body: CloudPostureStats = {
          ...allFindingsStats,
          benchmarksStats,
          resourceTypesAggs,
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
