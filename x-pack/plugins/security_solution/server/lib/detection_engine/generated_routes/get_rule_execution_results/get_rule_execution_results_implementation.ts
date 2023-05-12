/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import type { GetRuleExecutionResultsResponse } from '../../../../../common/generated_schema/get_rule_execution_results/get_rule_execution_results_response_schema.gen';
import type {
  GetRuleExecutionResultsRequestParams,
  GetRuleExecutionResultsRequestQuery,
  GetRuleExecutionResultsRequestBody,
} from '../../../../../common/generated_schema/get_rule_execution_results/get_rule_execution_results_request_schema.gen';

export const getRuleExecutionResultsImplementation = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<
    GetRuleExecutionResultsRequestParams,
    GetRuleExecutionResultsRequestQuery,
    GetRuleExecutionResultsRequestBody,
    'get'
  >,
  response: KibanaResponseFactory
): Promise<GetRuleExecutionResultsResponse> => {
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

  return executionResultsResponse;
};
