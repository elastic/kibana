/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Logger } from 'src/core/server';
import { AggregationsFiltersAggregate, SearchRequest, CountRequest } from '@elastic/elasticsearch/lib/api/types';
import type { SecuritySolutionPluginRouter } from '../../types';

const FINDINGS_INDEX = `kubebeat*`;

const getFindingsEsQuery = (): CountRequest => ({
    index: FINDINGS_INDEX,
    query: {
        bool: {
          filter: [{ term: { 'rule.benchmark': 'CIS Kubernetes' } }
        ],
        },
      }
  });

const getPassFindingsEsQuery = (): CountRequest => ({
  index: FINDINGS_INDEX,
  query: {
    bool: {
      filter: [{ term: { 'result.evaluation': 'passed' } },
              { term: { 'rule.benchmark': 'CIS Kubernetes' } }
    ],
    },
  },
});


export const getScoreRoute = (router: SecuritySolutionPluginRouter, logger: Logger): void =>
  router.get(
    {
      path: '/api/csp/score',
      validate: false,
    },
    async (context, _, response) => {
      try {
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const findings = await esClient.count(
          getFindingsEsQuery()
        );
        const passFindings = await esClient.count(getPassFindingsEsQuery());
        console.log(findings);
        return response.ok({
          body: {
            total: findings.body.count,
            score: passFindings.body.count / findings.body.count,
            pass: passFindings.body.count,
            fail: findings.body.count - passFindings.body.count  
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
