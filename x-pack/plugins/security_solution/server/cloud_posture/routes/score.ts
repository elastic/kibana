/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable  */

import { ElasticsearchClient, Logger } from 'src/core/server';
import {
  AggregationsFiltersAggregate,
  SearchRequest,
  CountRequest,
  SearchSort,
} from '@elastic/elasticsearch/lib/api/types';
import type { SecuritySolutionPluginRouter } from '../../types';
import { any, string } from 'joi';

const FINDINGS_INDEX = `kubebeat*`;

const getFindingsEsQuery = (benchmark: string = '*', runId: string): CountRequest => {
  if (benchmark == '*') {
    return {
      index: FINDINGS_INDEX,
      query: {
        bool: {
          filter: [{ term: { 'run_id.keyword': runId } }],
        },
      },
    };
  }
  return {
    index: FINDINGS_INDEX,
    query: {
      bool: {
        filter: [
          { term: { 'rule.benchmark.keyword': benchmark } },
          { term: { 'run_id.keyword': runId } },
        ],
      },
    },
  };
};

const getPassFindingsEsQuery = (benchmark: string = '*', runId: string): CountRequest => {
  if (benchmark == '*') {
    return {
      index: FINDINGS_INDEX,
      query: {
        bool: {
          filter: [
            { term: { 'result.evaluation.keyword': 'passed' } },
            { term: { 'run_id.keyword': runId } },
          ],
        },
      },
    };
  }
  return {
    index: FINDINGS_INDEX,
    query: {
      bool: {
        filter: [
          { term: { 'result.evaluation.keyword': 'passed' } },
          { term: { 'rule.benchmark.keyword': benchmark } },
          { term: { 'run_id.keyword': runId } },
        ],
      },
    },
  };
};

const fixScore = (value: number) => (value * 100).toFixed(1);

const getBenchmarksQuery = (): SearchRequest => ({
  index: FINDINGS_INDEX,
  size: 0,
  aggs: {
    benchmarks: {
      terms: { field: 'rule.benchmark.keyword' },
    },
  },
});

const getLatestFinding = (): SearchRequest => ({
  index: FINDINGS_INDEX,
  size: 1,
  sort: { '@timestamp': 'desc' },
  query: {
    match_all: {},
  },
});

// todo: get top 5 frequent
const getEvaluationPerFilenameEsQuery = (runId: string): SearchRequest => ({
  index: FINDINGS_INDEX,
  size: 1000,
  query: {
    bool: {
      filter: [{ term: { 'run_id.keyword': runId } }],
    },
  },
  aggs: {
    group: {
      terms: { field: 'resource.filename.keyword' },
      aggs: {
        group_docs: {
          terms: { field: 'result.evaluation.keyword' },
        },
      },
    },
  },
});
const getLatestRunId = async (esClient: ElasticsearchClient) => {
  const latestFinding = await esClient.search(getLatestFinding());
  const latestRunId = latestFinding.body.hits.hits[0]?._source.run_id;
  return latestRunId;
};

const getEvaluationPerFilename = async (esClient: ElasticsearchClient, runId: string) => {
  const evaluationsPerFilename = await esClient.search(getEvaluationPerFilenameEsQuery(runId));
  const evaluationsBuckets = evaluationsPerFilename.body.aggregations?.group.buckets;
  const counterPerFilename = evaluationsBuckets.map((filenameObject: any) => ({
    name: filenameObject.key,
    totalPassed: filenameObject.group_docs.buckets.find((e) => e.key === 'passed')?.doc_count || 0,
    totalFailed: filenameObject.group_docs.buckets.find((e) => e.key === 'failed')?.doc_count || 0,
  }));
  return counterPerFilename;
};

const getAllFindingsStats = async (esClient: ElasticsearchClient, runId: string) => {
  const findings = await esClient.count(getFindingsEsQuery('*', runId));
  const passFindings = await esClient.count(getPassFindingsEsQuery('*', runId));
  return {
    total: findings.body.count,
    postureScore: fixScore(passFindings.body.count / findings.body.count),
    totalPassed: passFindings.body.count,
    totalFailed: findings.body.count - passFindings.body.count,
  };
};

const getScorePerBenchmark = async (esClient: ElasticsearchClient, runId: string) => {
  // const benachmarksQueryResult = await esClient.search(getBenchmarksQuery());
  // const benchmarks = benachmarksQueryResult.body.aggregations?.map((benchmark: any) => benchmark.bucket.key );
  // console.log(counterPerFilename1);
  // @ts-ignore
  const benchmarks = ['CIS Kubernetes'];
  const benchmarkScores = Promise.all(
    benchmarks.map(async (benchmark) => {
      const benchmarkFindings = await esClient.count(getFindingsEsQuery(benchmark, runId));
      const benchmarkPassFindings = await esClient.count(getPassFindingsEsQuery(benchmark, runId));
      return {
        name: benchmark,
        total: benchmarkFindings.body.count,
        postureScore: fixScore(benchmarkPassFindings.body.count / benchmarkFindings.body.count),
        totalPassed: benchmarkPassFindings.body.count,
        totalFailed: benchmarkFindings.body.count - benchmarkPassFindings.body.count,
      };
    })
  );
  return benchmarkScores;
};

export const getScoreRoute = (router: SecuritySolutionPluginRouter, logger: Logger): void =>
  router.get(
    {
      path: '/api/csp/stats',
      validate: false,
    },

    async (context, _, response) => {
      try {
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const latestRunId = await getLatestRunId(esClient);
        const allFindingsStats = await getAllFindingsStats(esClient, latestRunId);
        const statsPerBenchmark = await getScorePerBenchmark(esClient, latestRunId);
        const evaluationsPerFilename = await getEvaluationPerFilename(esClient, latestRunId);

        return response.ok({
          body: {
            totalFindings: allFindingsStats.total,
            postureScore: allFindingsStats.postureScore,
            totalPassed: allFindingsStats.totalPassed,
            totalFailed: allFindingsStats.totalFailed,
            benchmarks: statsPerBenchmark,
            evaluationsPerFilename: evaluationsPerFilename,
          },
        });
      } catch (err) {
        return response.customError({ body: { message: 'Unknown error' }, statusCode: 500 });
      }
    }
  );

// const getRunId = (v: any) => v.group_docs.hits.hits?.[0]?.fields['run_id.keyword'][0];

// const AGENT_LOGS_INDEX = `agent_logs`;
// const AGENT_TIMEOUT_IN_MINUTES = 60;

// const getFindingsEsQuery = ({ runIds }: { runIds: string[] }): SearchRequest => ({
//   index: FINDINGS_INDEX,
//   size: 1000,
//   query: { terms: { 'run_id.keyword': runIds } },
// });

// const getAgentLogsEsQuery = (): SearchRequest => ({
//     index: AGENT_LOGS_INDEX,
//     size: 1000,
//     query: {
//       bool: {
//         filter: [
//           { term: { 'event_status.keyword': 'end' } },
//           { term: { 'compliance.keyword': 'k8s cis' } },
//         ],
//       },
//     },
//     aggs: {
//       group: {
//         terms: { field: 'agent.keyword' },
//         aggs: {
//           group_docs: {
//             top_hits: {
//               size: 1,
//               sort: [{ timestamp: { order: 'desc' } }],
//             },
//           },
//         },
//       },
//     },
//     fields: ['run_id.keyword', 'agent.keyword'],
//     _source: false,
//   });

// export const getScoreRoute = (router: SecuritySolutionPluginRouter, logger: Logger): void =>
//   router.get(
//     {
//       path: '/api/csp/score',
//       validate: false,
//     },
//     async (context, _, response) => {
//       try {
//         const esClient = context.core.elasticsearch.client.asCurrentUser;
//         const agentLogs = await esClient.search(getAgentLogsEsQuery());
//         const aggregations = agentLogs.body.aggregations;

//         if (!aggregations) {
//           logger.error(`Missing 'aggregations' in agent logs query response`);
//           return response.notFound();
//         }
//         const buckets = (aggregations.group as Record<string, AggregationsFiltersAggregate>)
//           .buckets;
//         if (!Array.isArray(buckets)) {
//           logger.error(`Missing 'buckets' in agent logs query response`);
//           return response.notFound();
//         }
//         const findings = await esClient.search(
//           getFindingsEsQuery({ runIds: buckets.map(getRunId) })
//         );
//         const passFindings = await esClient.search(getPassFindingsEsQuery());

//         return response.ok({
//           body: {
//             score: passFindings.body.hits.hits.length / findings.body.hits.hits.length,
//             pass: passFindings.body.hits.hits.length,
//             fail: passFindings.body.hits.hits.length - findings.body.hits.hits.length,
//           },
//         });
//       } catch (err) {
//         return response.customError({ body: { message: 'Unknown error' }, statusCode: 500 });
//       }
//     }

//   );
