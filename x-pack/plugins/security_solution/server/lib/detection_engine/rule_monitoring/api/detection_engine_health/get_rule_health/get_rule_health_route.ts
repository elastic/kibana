/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../../routes/utils';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';

import type {
  GetRuleHealthRequest,
  GetRuleHealthResponse,
  HealthResponseMetadata,
} from '../../../../../../../common/detection_engine/rule_monitoring';
import {
  GET_RULE_HEALTH_URL,
  GetRuleHealthRequestBody,
} from '../../../../../../../common/detection_engine/rule_monitoring';
import { fetchRuleById } from './fetch_rule_by_id';
import { validateGetRuleHealthRequest } from './validate_get_rule_health_request';

/**
 * Get health overview of a rule. Scope: a given detection rule in the current Kibana space.
 * Returns:
 *   - current health stats at the moment of the API call
 *   - health history over a given period of time
 */
export const getRuleHealthRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: GET_RULE_HEALTH_URL,
      validate: {
        body: buildRouteValidation(GetRuleHealthRequestBody),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const params = validateGetRuleHealthRequest(request.body);

        const ctx = await context.resolve(['core', 'alerting', 'securitySolution']);
        const soClient = ctx.core.savedObjects.client;
        const rulesClient = ctx.alerting.getRulesClient();
        const ruleExecutionLog = ctx.securitySolution.getRuleExecutionLog();

        const fetchRuleResult = await fetchRuleById(rulesClient, params.ruleId);
        if (fetchRuleResult.error) {
          return siemResponse.error({
            body: fetchRuleResult.error.message,
            statusCode: fetchRuleResult.error.statusCode,
          });
        }

        const rule = fetchRuleResult.value;

        const responseBody: GetRuleHealthResponse = {
          meta: createRuleHealthMetadata(params),
          rule,
          last_execution: {} as any,
          execution_stats: {} as any,
          execution_history: {} as any,
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

const createRuleHealthMetadata = (params: GetRuleHealthRequest): HealthResponseMetadata => {
  const requestReceivedAt = moment(params.requestReceivedAt);
  const responseGeneratedAt = moment().utc();
  const processingTime = moment.duration(responseGeneratedAt.diff(requestReceivedAt));

  return {
    request_received_at: requestReceivedAt.toISOString(),
    response_generated_at: responseGeneratedAt.toISOString(),
    processing_time_ms: processingTime.asMilliseconds(),
    interval: params.interval,
  };
};
