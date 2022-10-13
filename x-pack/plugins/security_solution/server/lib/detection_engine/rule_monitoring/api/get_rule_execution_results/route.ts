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

import type { GetRuleExecutionResultsResponse } from '../../../../../../common/detection_engine/rule_monitoring';
import {
  GET_RULE_EXECUTION_RESULTS_URL,
  GetRuleExecutionResultsRequestParams,
  GetRuleExecutionResultsRequestQuery,
} from '../../../../../../common/detection_engine/rule_monitoring';

/**
 * Returns execution results of a given rule (aggregated by execution UUID) from Event Log.
 * Accepts rule's saved object ID (`rule.id`), `start`, `end` and `filters` query params.
 */
export const getRuleExecutionResultsRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: GET_RULE_EXECUTION_RESULTS_URL,
      validate: {
        params: buildRouteValidation(GetRuleExecutionResultsRequestParams),
        query: buildRouteValidation(GetRuleExecutionResultsRequestQuery),
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
        const ctx = await context.resolve(['securitySolution']);
        const executionLog = ctx.securitySolution.getRuleExecutionLog();
        const executionResultsResponse = await executionLog.getExecutionResults({
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

        const responseBody: GetRuleExecutionResultsResponse = executionResultsResponse;

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
