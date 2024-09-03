/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { CSP_GET_BENCHMARK_RULES_STATE_ROUTE_PATH } from '@kbn/cloud-security-posture-common';
import type { CspBenchmarkRulesStates } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { CspRouter } from '../../../types';
import { getCspBenchmarkRulesStatesHandler } from './v1';

export const defineGetCspBenchmarkRulesStatesRoute = (router: CspRouter) =>
  router.versioned
    .get({
      access: 'internal',
      path: CSP_GET_BENCHMARK_RULES_STATE_ROUTE_PATH,
      options: {
        tags: ['access:cloud-security-posture-read'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      async (context, request, response) => {
        if (!(await context.fleet).authz.fleet.all) {
          return response.forbidden();
        }
        const cspContext = await context.csp;

        try {
          const encryptedSoClient = cspContext.encryptedSavedObjects;

          const rulesStates: CspBenchmarkRulesStates = await getCspBenchmarkRulesStatesHandler(
            encryptedSoClient
          );

          return response.ok({
            body: rulesStates,
          });
        } catch (err) {
          const error = transformError(err);

          cspContext.logger.error(`Failed to fetch CSP benchmark rules state: ${error.message}`);
          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode || 500, // Default to 500 if no specific status code is provided
          });
        }
      }
    );
