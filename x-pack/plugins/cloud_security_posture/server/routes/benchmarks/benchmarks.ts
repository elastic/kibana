/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { BENCHMARKS_ROUTE_PATH } from '../../../common/constants';
import { benchmarksQueryParamsSchema } from '../../../common/types/benchmarks/v1';
import { CspRouter } from '../../types';
import { getBenchmarks as getBenchmarksV1 } from './v1';
import { getBenchmarks as getBenchmarksV2 } from './v2';
import { benchmarkResponseSchema } from '../../../common/types/latest';

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
        try {
          const cspBenchmarks = await getBenchmarksV1(
            cspContext.soClient,
            cspContext.packagePolicyService,
            request.query,
            cspContext.agentPolicyService,
            cspContext.agentService,
            cspContext.logger
          );
          return response.ok({
            body: cspBenchmarks,
          });
        } catch (err) {
          const error = transformError(err);
          cspContext.logger.error(`Failed to fetch benchmarks ${err}`);
          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    )
    .addVersion(
      {
        version: '2',
        validate: {
          response: {
            200: {
              body: benchmarkResponseSchema,
            },
          },
        },
      },
      async (context, request, response) => {
        if (!(await context.fleet).authz.fleet.all) {
          return response.forbidden();
        }
        const cspContext = await context.csp;
        const esClient = cspContext.esClient.asCurrentUser;
        try {
          const cspBenchmarks = await getBenchmarksV2(
            esClient,
            cspContext.soClient,
            cspContext.encryptedSavedObjects,
            cspContext.logger
          );
          return response.ok({
            body: cspBenchmarks,
          });
        } catch (err) {
          const error = transformError(err);
          cspContext.logger.error(`Failed to fetch benchmarks ${err}`);
          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
