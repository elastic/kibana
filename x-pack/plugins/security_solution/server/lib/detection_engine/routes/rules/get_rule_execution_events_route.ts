/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../utils';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import { DETECTION_ENGINE_RULE_EXECUTION_EVENTS_URL } from '../../../../../common/constants';
import { GetRuleExecutionEventsRequestParams } from '../../../../../common/detection_engine/schemas/request/get_rule_execution_events_request';
import { GetRuleExecutionEventsResponse } from '../../../../../common/detection_engine/schemas/response/get_rule_execution_events_response';

/**
 * Returns execution events of a given rule (e.g. status changes) from Event Log.
 * Accepts rule's saved object ID (`rule.id`).
 *
 * NOTE: This endpoint is under construction. It will be extended and finalized.
 * https://github.com/elastic/kibana/issues/119598
 */
export const getRuleExecutionEventsRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: DETECTION_ENGINE_RULE_EXECUTION_EVENTS_URL,
      validate: {
        params: buildRouteValidation(GetRuleExecutionEventsRequestParams),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const { ruleId } = request.params;
      const siemResponse = buildSiemResponse(response);

      try {
        const executionLog = context.securitySolution.getRuleExecutionLog();
        const executionEvents = await executionLog.getLastFailures(ruleId);

        const responseBody: GetRuleExecutionEventsResponse = {
          events: executionEvents,
        };

        return response.ok({ body: responseBody });
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
