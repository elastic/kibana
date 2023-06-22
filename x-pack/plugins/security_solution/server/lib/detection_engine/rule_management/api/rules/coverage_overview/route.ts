/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL } from '../../../../../../../common/detection_engine/rule_management/api/urls';
import { buildSiemResponse } from '../../../../routes/utils';
import { handleCoverageOverviewRequest } from './handle_coverage_overview_request';

export const getCoverageOverviewRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: RULE_MANAGEMENT_COVERAGE_OVERVIEW_URL,
      validate: {},
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const responseData = await handleCoverageOverviewRequest({
          resolveDependencies: async () => {
            const ctx = await context.resolve(['alerting']);

            return { rulesClient: ctx.alerting.getRulesClient() };
          },
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
