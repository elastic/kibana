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
interface LastCycle {
  run_id: string;
}

interface GroupFilename {
  // TODO find the 'key', 'doc_count' interface
  key: string;
  doc_count: number;
  group_docs: AggregationsTermsAggregate<AggregationsKeyedBucketKeys>;
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
  return lastCycle?._source?.run_id;
};

export const getBenchmarks = async (esClient: ElasticsearchClient) => {
  const queryResult = await esClient.search(getBenchmarksQuery());
  const benchmarksBuckets = queryResult.body.aggregations?.benchmarks as AggregationsTermsAggregate<
    DictionaryResponseBase<string, string>
  >;
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
  const benchmarkPromises = benchmarks.map((benchmark) => {
    const benchmarkFindings = esClient.count(getFindingsEsQuery(benchmark, cycleId));
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
        return {
          name: benchmark,
          postureScore: calculatePostureScore(totalFindings, totalPassed, totalFailed),
          totalFindings,
          totalPassed,
          totalFailed,
        };
      }
    );
  });
  return Promise.all(benchmarkPromises);
};

export const getResourcesEvaluation = async (
  esClient: ElasticsearchClient,
  cycleId: string
): Promise<EvaluationResult[]> => {
  const failedEvaluationsPerResourceResult = await esClient.search(
    getResourcesEvaluationEsQuery(cycleId, RULE_FAILED, numOfResource)
  );

  const failedResourcesGroup = failedEvaluationsPerResourceResult.body.aggregations
    ?.group as AggregationsTermsAggregate<GroupFilename>;
  const topFailedResources = failedResourcesGroup.buckets.map((e) => e.key);
  const failedEvaluationPerResource = failedResourcesGroup.buckets.map((e) => {
    return {
      resource: e.key,
      value: e.doc_count,
      evaluation: RULE_FAILED,
    } as const;
  });

  const passedEvaluationsPerResourceResult = await esClient.search(
    getResourcesEvaluationEsQuery(cycleId, RULE_PASSED, 5, topFailedResources)
  );
  const passedResourcesGroup = passedEvaluationsPerResourceResult.body.aggregations
    ?.group as AggregationsTermsAggregate<GroupFilename>;
  const passedEvaluationPerResources = passedResourcesGroup.buckets.map((e) => {
    return {
      resource: e.key,
      value: e.doc_count,
      evaluation: RULE_PASSED,
    } as const;
  });

  return [...passedEvaluationPerResources, ...failedEvaluationPerResource];
};

export const defineGetStatsRoute = (router: IRouter): void =>
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
