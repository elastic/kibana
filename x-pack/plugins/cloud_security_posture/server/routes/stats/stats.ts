/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IRouter } from 'src/core/server';
import type { AggregationsMultiBucketAggregateBase as Aggregation } from '@elastic/elasticsearch/lib/api/types';
import { number, UnknownRecord } from 'io-ts';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { BenchmarkStats, CloudPostureStats, Score } from '../../../common/types';
import { getBenchmarksQuery, getFindingsEsQuery, getLatestFindingQuery } from './stats_queries';
import { RULE_FAILED, RULE_PASSED } from '../../constants';
import { STATS_ROUTE_PATH } from '../../../common/constants';
import { CspAppContext } from '../../plugin';
import { getResourceTypesAggs } from './get_resource_type_aggs';
import { getClusterAggs } from './get_cluster_aggs';

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

export interface KeyDocCount<TKey = string> {
  key: TKey;
  doc_count: number;
}

/**
 * @param value value is [0, 1] range
 */
export const roundScore = (value: number): Score => Number((value * 100).toFixed(1));

export const calculatePostureScore = (
  total: number,
  passed: number,
  failed: number
): Score | undefined =>
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
    { benchmarks: Aggregation<Pick<KeyDocCount, 'key'>> }
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
    postureScore,
    totalFindings,
    totalPassed,
    totalFailed,
  };

  assertBenchmarkStats(stats);

  return stats;
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
        const latestCycleID = await getLatestCycleId(esClient);

        const [stats, resourceTypesAggs, clusterAggs] = await Promise.all([
          getAllFindingsStats(esClient, latestCycleID),
          getResourceTypesAggs(esClient, latestCycleID),
          getClusterAggs(esClient, latestCycleID),
        ]);

        const body: CloudPostureStats = {
          stats,
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
