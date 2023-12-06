/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BENCHMARKS_ROUTE_PATH } from '../../../common/constants';
import { benchmarksQueryParamsSchema } from '../../../common/schemas/benchmark';
import { CspRouter } from '../../types';
import { getBenchmark as benchmarkApi1 } from './v1';
import { getBenchmark as benchmarkApi2 } from './v2';

export const PACKAGE_POLICY_SAVED_OBJECT_TYPE = 'ingest-package-policies';

export const defineGetBenchmarksRoute = (router: CspRouter) =>
  router.versioned
    .get({
      access: 'internal',
      path: BENCHMARKS_ROUTE_PATH,
      options: {
        tags: ['access:cloud-security-posture-read'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: benchmarksQueryParamsSchema,
          },
        },
      },
      async (context, request, response) => {
        if (!(await context.fleet).authz.fleet.all) {
          return response.forbidden();
        }
        const cspContext = await context.csp;
        return benchmarkApi1(
          cspContext.soClient,
          cspContext.packagePolicyService,
          request.query,
          cspContext.agentPolicyService,
          cspContext.agentService,
          cspContext.logger,
          response.ok,
          response.customError
        );
      }
    )
    .addVersion(
      {
        version: '2',
        validate: {
          request: {
            query: benchmarksQueryParamsSchema,
          },
        },
      },
      async (context, request, response) => {
        if (!(await context.fleet).authz.fleet.all) {
          return response.forbidden();
        }
        const cspContext = await context.csp;
        return benchmarkApi2(
          cspContext,
          cspContext.soClient,
          cspContext.packagePolicyService,
          request.query,
          cspContext.agentPolicyService,
          cspContext.agentService,
          cspContext.logger,
          response.ok,
          response.customError
        );
      }
    );
