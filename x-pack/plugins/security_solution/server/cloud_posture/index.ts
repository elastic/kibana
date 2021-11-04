/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SecuritySolutionPluginRouter } from '../types';

// /csp/rules
// /csp/findings

export const createCSPIndexRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: '/api/csp',
      validate: false,
      // options: {
      //   tags: ['access:securitySolution'],
      // },
    },
    async (context, _, response) => {
      try {
        return response.ok({ body: { acknowledged: true } });
      } catch (err) {
        return response.notFound({ body: { message: 'err' } });
      }
    }
  );
};
