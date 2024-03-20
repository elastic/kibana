/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import type { IKibanaResponse } from '@kbn/core-http-server';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { GET_AI_RULE_MONITORING_RESULTS_URL } from '../../../../../../common/api/detection_engine/rule_monitoring';
import { buildRouteValidationWithZod } from '../../../../../utils/build_validation/route_validation';
import { handleAiRuleMonitoringResultsRequest } from './handle_ai_rule_monitoring_results_request';

type GetAiRuleMonitoringResultsRequestBody = z.infer<typeof GetAiRuleMonitoringResultsRequestBody>;
const GetAiRuleMonitoringResultsRequestBody = z.object({
  connectorId: z.string().nonempty(),
});

export function getAiRuleMonitoringResultsRoute(router: SecuritySolutionPluginRouter): void {
  router.versioned
    .post({
      access: 'internal',
      path: GET_AI_RULE_MONITORING_RESULTS_URL,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(GetAiRuleMonitoringResultsRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<{}>> => {
        return handleAiRuleMonitoringResultsRequest({
          response,
          resolveParameters: () => ({
            connectorId: request.body.connectorId,
          }),
          resolveDependencies: async () => {
            const { actions, securitySolution } = await context.resolve([
              'actions',
              'securitySolution',
            ]);

            return {
              actionsClient: actions.getActionsClient(),
              healthClient: securitySolution.getDetectionEngineHealthClient(),
            };
          },
        });
      }
    );
}
