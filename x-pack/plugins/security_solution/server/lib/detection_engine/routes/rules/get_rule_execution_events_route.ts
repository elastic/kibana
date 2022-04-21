/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { GetAggregateRuleExecutionEventsResponse } from '../../../../../common/detection_engine/schemas/response';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../utils';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import { DETECTION_ENGINE_RULE_EXECUTION_EVENTS_URL } from '../../../../../common/constants';
import {
  GetRuleExecutionEventsQueryParams,
  GetRuleExecutionEventsRequestParams,
} from '../../../../../common/detection_engine/schemas/request/get_rule_execution_events_schema';

/**
 * Returns execution events of a given rule (aggregated by executionId) from Event Log.
 * Accepts rule's saved object ID (`rule.id`), `start`, `end` and `filters` query params.
 */
export const getRuleExecutionEventsRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: DETECTION_ENGINE_RULE_EXECUTION_EVENTS_URL,
      validate: {
        params: buildRouteValidation(GetRuleExecutionEventsRequestParams),
        query: buildRouteValidation(GetRuleExecutionEventsQueryParams),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const { ruleId } = request.params;
      const {
        start,
        end,
        query_text: queryText,
        status_filters: statusFilters,
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
      } = request.query;
      const siemResponse = buildSiemResponse(response);

      try {
        const executionLog = context.securitySolution.getRuleExecutionLog();
        const { events, total } = await executionLog.getAggregateExecutionEvents({
          ruleId,
          start,
          end,
          queryText,
          statusFilters,
          page,
          perPage,
          sortField,
          sortOrder,
        });

        const responseBody: GetAggregateRuleExecutionEventsResponse = {
          events,
          total,
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
