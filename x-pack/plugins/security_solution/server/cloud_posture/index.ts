/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SecuritySolutionPluginRouter } from '../types';

const data = [
  {
    category: 'Passed',
    value: 78,
    color: '#54B399',
  },
  {
    category: 'Failed',
    value: 22,
    color: '#E7664C',
  },
];

// /api/csp/logs -> [runId...]
// /api/csp/findings -> [].filter(runId)

export const createCSPIndexRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: '/api/csp/score',
      validate: false,
      // options: {
      //   tags: ['access:securitySolution'],
      // },
    },
    async (context, _, response) => {
      try {
        // const esClient = context.core.elasticsearch.client.asCurrentUser;
        // const agentLogs = esClient.search<unknown>(
        //   {
        //     index: 'agent_logs*',
        //     size: 10000,
        //     from: 0,
        //     body: {
        //       query: {
        //         bool: {
        //           filter: [
        //             { term: { 'event_status.keyword': 'end' } },
        //             { range: { timestamp: { gte: 'now-1d' } } },
        //             { term: { 'compliance.keyword': 'k8s cis' } },
        //           ],
        //         },
        //       },
        //     },
        //   },
        //   { ignore: [404] }
        // );
        // console.log({ data2 });
        return response.ok({ body: data });
      } catch (err) {
        return response.notFound({ body: { message: 'err' } });
      }
    }
  );
};
