/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { CoverageOverviewRequestBody } from '../../../../../../../common/detection_engine/rule_management/api/rules/coverage_overview/request_schema';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL } from '../../../../../../../common/detection_engine/rule_management/api/urls';
import { buildSiemResponse } from '../../../../routes/utils';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import { handleCoverageOverviewRequest } from './handle_coverage_overview_request';

export const getCoverageOverviewRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL,
      validate: {
        body: buildRouteValidation(CoverageOverviewRequestBody),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const ctx = await context.resolve(['alerting']);

        const responseData = await handleCoverageOverviewRequest({
          params: request.body,
          deps: { rulesClient: ctx.alerting.getRulesClient() },
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
