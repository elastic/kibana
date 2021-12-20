/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IRouter } from 'src/core/server';
import type {
  AggregationsTermsAggregate,
  DictionaryResponseBase,
  AggregationsKeyedBucketKeys,
} from '@elastic/elasticsearch/lib/api/types';
import type { CloudPostureStats, BenchmarkStats, EvaluationStats } from '../../../common/types';
import {
  getFindingsEsQuery,
  getResourcesEvaluationEsQuery,
  getBenchmarksQuery,
  getLatestFindingQuery,
} from './stats_queries';
import { STATS_ROUTH_PATH } from '../../../common/constants';
interface LastCycle {
  run_id: string;
}

interface GroupFilename {
  // TODO find the 'key', 'doc_count' interface
  key: string;
  doc_count: number;
  group_docs: AggregationsTermsAggregate<AggregationsKeyedBucketKeys>;
}

/**
 * @param value value is [0, 1] range
 */
export const roundScore = (value: number) => Number((value * 100).toFixed(1));

const calculatePostureScore = (total: number, passed: number, failed: number) =>
  passed + failed === 0 || total === undefined ? undefined : roundScore(passed / (passed + failed));

const getLatestCycleId = async (esClient: ElasticsearchClient) => {
  const latestFinding = await esClient.search<LastCycle>(getLatestFindingQuery());
  const lastCycle = latestFinding.body.hits.hits[0];
  return lastCycle?._source?.run_id;
};

export const getBenchmarks = async (esClient: ElasticsearchClient) => {
  const queryReult = await esClient.search(getBenchmarksQuery());
  const bencmarksBuckets = queryReult.body.aggregations?.benchmarks as AggregationsTermsAggregate<
    DictionaryResponseBase<string, string>
  >;
  return bencmarksBuckets.buckets.map((e) => e.key);
};

export const getAllFindingsStats = async (
  esClient: ElasticsearchClient,
  cycleId: string
): Promise<BenchmarkStats> => {
  const findings = await esClient.count(getFindingsEsQuery(cycleId));
  const passedFindings = await esClient.count(getFindingsEsQuery(cycleId, 'passed'));
  const failedFindings = await esClient.count(getFindingsEsQuery(cycleId, 'failed'));

  const totalFindings = findings.body.count;
  const totalPassed = passedFindings.body.count;
  const totalFailed = failedFindings.body.count;

  return {
    name: 'general',
    postureScore: calculatePostureScore(totalFindings, totalPassed, totalFailed),
    totalFindings,
    totalPassed,
    totalFailed,
  };
};

export const getBenchmarksStats = async (
  esClient: ElasticsearchClient,
  cycleId: string,
  benchmarks: string[]
): Promise<BenchmarkStats[]> => {
  const ps = [];

  for (const benchmark of benchmarks) {
    const benchmarkFindings = await esClient.count(getFindingsEsQuery(benchmark, cycleId));
    const benchmarkPassedFindings = await esClient.count(
      getFindingsEsQuery(cycleId, 'passed', benchmark)
    );
    const benchmarkFailedFindings = await esClient.count(
      getFindingsEsQuery(cycleId, 'failed', benchmark)
    );
    const totalFindings = benchmarkFindings.body.count;
    const totalPassed = benchmarkPassedFindings.body.count;
    const totalFailed = benchmarkFailedFindings.body.count;

    ps.push({
      name: benchmark,
      postureScore: calculatePostureScore(totalFindings, totalPassed, totalFailed),
      totalFindings,
      totalPassed,
      totalFailed,
    });
  }
  const benchmarkScores = Promise.all(ps);
  return benchmarkScores;
};

export const getResourcesEvaluation = async (
  esClient: ElasticsearchClient,
  cycleId: string
): Promise<EvaluationStats[]> => {
  const failedEvaluationsPerResourceResult = await esClient.search(
    getResourcesEvaluationEsQuery(cycleId, 'failed', 5)
  );

  const failedResourcesGroup = failedEvaluationsPerResourceResult.body.aggregations
    ?.group as AggregationsTermsAggregate<GroupFilename>;
  const topFailedResources = failedResourcesGroup.buckets.map((e) => e.key);
  const failedEvaluationPerResorces = failedResourcesGroup.buckets.map((e) => {
    return {
      resource: e.key,
      value: e.doc_count,
      evaluation: 'failed',
    } as const;
  });

  const passedEvaluationsPerResourceResult = await esClient.search(
    getResourcesEvaluationEsQuery(cycleId, 'passed', 5, topFailedResources)
  );
  const passedResourcesGroup = passedEvaluationsPerResourceResult.body.aggregations
    ?.group as AggregationsTermsAggregate<GroupFilename>;
  const passedEvaluationPerResorces = passedResourcesGroup.buckets.map((e) => {
    return {
      resource: e.key,
      value: e.doc_count,
      evaluation: 'passed',
    } as const;
  });

  return [...passedEvaluationPerResorces, ...failedEvaluationPerResorces];
};

export const defineGetStatsRoute = (router: IRouter): void =>
  router.get(
    {
      path: STATS_ROUTH_PATH,
      validate: false,
    },
    async (context, _, response) => {
      try {
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const benchmarks = await getBenchmarks(esClient);
        const latestCycleID = await getLatestCycleId(esClient);
        if (latestCycleID === undefined) {
          throw new Error('cycle id is missing');
        }
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
        // TODO - validate err object and parse
        return response.customError({ body: { message: 'Unknown error' }, statusCode: 500 });
      }
    }
  );
