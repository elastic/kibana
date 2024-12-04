/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse } from '@kbn/core/server';
import type { CoverageOverviewResponse } from '../../../../../../../common/api/detection_engine';
import {
  CoverageOverviewRequestBody,
  RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL,
} from '../../../../../../../common/api/detection_engine';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../../routes/utils';
import { handleCoverageOverviewRequest } from './handle_coverage_overview_request';

export const getCoverageOverviewRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidation(CoverageOverviewRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<CoverageOverviewResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const ctx = await context.resolve(['alerting']);

          const responseData = await handleCoverageOverviewRequest({
            params: request.body,
            deps: { rulesClient: await ctx.alerting.getRulesClient() },
          });

          return response.ok({
            body: responseData,
          });
        } catch (err) {
          const error = transformError(err);

          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
