/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { AdHocRunResponse } from '../../../../../../common/api/detection_engine/rule_execution';
import { adHocRunSchema } from '../../../../../../common/api/detection_engine/rule_execution';
import { DETECTION_ENGINE_RULES_AD_HOC_RUN } from '../../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../routes/utils';

export const adHocRunRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'public',
      path: DETECTION_ENGINE_RULES_AD_HOC_RUN,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { body: buildRouteValidation(adHocRunSchema) },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<AdHocRunResponse>> => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { id, from, to, actions, maxSignals } = request.body;

          const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
          const rulesClient = ctx.alerting.getRulesClient();

          await rulesClient.adHocRun({ id, from, to, actions, maxSignals });

          return response.ok({ body: { id } });
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
