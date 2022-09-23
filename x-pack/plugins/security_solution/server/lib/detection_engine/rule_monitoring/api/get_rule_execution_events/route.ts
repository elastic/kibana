/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../routes/utils';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import type { GetRuleExecutionEventsResponse } from '../../../../../../common/detection_engine/rule_monitoring';
import {
  GET_RULE_EXECUTION_EVENTS_URL,
  GetRuleExecutionEventsRequestParams,
  GetRuleExecutionEventsRequestQuery,
} from '../../../../../../common/detection_engine/rule_monitoring';

/**
 * Returns execution events of a given rule (e.g. status changes) from Event Log.
 * Accepts rule's saved object ID (`rule.id`) and options for filtering, sorting and pagination.
 */
export const getRuleExecutionEventsRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: GET_RULE_EXECUTION_EVENTS_URL,
      validate: {
        params: buildRouteValidation(GetRuleExecutionEventsRequestParams),
        query: buildRouteValidation(GetRuleExecutionEventsRequestQuery),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const { params, query } = request;
      const siemResponse = buildSiemResponse(response);

      try {
        const ctx = await context.resolve(['securitySolution']);
        const executionLog = ctx.securitySolution.getRuleExecutionLog();
        const executionEventsResponse = await executionLog.getExecutionEvents({
          ruleId: params.ruleId,
          eventTypes: query.event_types,
          logLevels: query.log_levels,
          sortOrder: query.sort_order,
          page: query.page,
          perPage: query.per_page,
        });

        const responseBody: GetRuleExecutionEventsResponse = executionEventsResponse;

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
