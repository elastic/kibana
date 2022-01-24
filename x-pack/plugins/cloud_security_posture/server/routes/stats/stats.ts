/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IRouter } from 'src/core/server';
import type { AggregationsMultiBucketAggregateBase } from '@elastic/elasticsearch/lib/api/types';
import { number, UnknownRecord } from 'io-ts';
import { transformError } from '@kbn/securitysolution-es-utils';
import { CspAppContext } from '../../lib/csp_app_context_services';

import type {
  CloudPostureStats,
  BenchmarkStats,
  EvaluationResult,
  Score,
} from '../../../common/types';
import {
  getFindingsEsQuery,
  getResourcesEvaluationEsQuery,
  getBenchmarksQuery,
  getLatestFindingQuery,
} from './stats_queries';
import { STATS_ROUTE_PATH } from '../../../common/constants';
import { RULE_PASSED, RULE_FAILED } from '../../constants';

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

interface ResourcesEvaluationEsAgg {
  group: AggregationsMultiBucketAggregateBase<GroupFilename>;
}

const numOfResource = 5;

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
    { benchmarks: AggregationsMultiBucketAggregateBase<Pick<GroupFilename, 'key'>> }
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

export const getResourcesEvaluation = async (
  esClient: ElasticsearchClient,
  cycleId: string
): Promise<EvaluationResult[]> => {
  const failedEvaluationsPerResourceResult = await esClient.search<
    GroupFilename,
    ResourcesEvaluationEsAgg
  >(getResourcesEvaluationEsQuery(cycleId, RULE_FAILED, numOfResource));

  const failedResourcesGroup = failedEvaluationsPerResourceResult.body.aggregations?.group!;
  if (!Array.isArray(failedResourcesGroup.buckets)) {
    throw new Error('missing buckets array');
  }
  const topFailedResources = failedResourcesGroup.buckets.map((e) => e.key);
  const failedEvaluationPerResource = failedResourcesGroup.buckets.map((e) => {
    return {
      resource: e.key,
      value: e.doc_count,
      evaluation: RULE_FAILED,
    } as const;
  });

  const passedEvaluationsPerResourceResult = await esClient.search<
    GroupFilename,
    ResourcesEvaluationEsAgg
  >(getResourcesEvaluationEsQuery(cycleId, RULE_PASSED, 5, topFailedResources));
  const passedResourcesGroup = passedEvaluationsPerResourceResult.body.aggregations?.group!;

  if (!Array.isArray(passedResourcesGroup.buckets)) {
    throw new Error('missing buckets array');
  }

  const passedEvaluationPerResources = passedResourcesGroup.buckets.map((e) => {
    return {
      resource: e.key,
      value: e.doc_count,
      evaluation: RULE_PASSED,
    } as const;
  });

  return [...passedEvaluationPerResources, ...failedEvaluationPerResource];
};

export const defineGetStatsRoute = (router: IRouter, cspContext: CspAppContext): void =>
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

        const [allFindingsStats, benchmarksStats, resourcesEvaluations] = await Promise.all([
          getAllFindingsStats(esClient, latestCycleID),
          getBenchmarksStats(esClient, latestCycleID, benchmarks),
          getResourcesEvaluation(esClient, latestCycleID),
        ]);
        const body: CloudPostureStats = {
          ...allFindingsStats,
          benchmarksStats,
          resourcesEvaluations,
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
