/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchOptions } from '@kbn/core-http-browser';
import type {
  GetRuleExecutionResultsRequestQuery,
  GetRuleExecutionResultsResponse,
} from './get_rule_execution_results_route.gen';

interface HttpClient {
  fetch<T>(url: string, options: HttpFetchOptions): Promise<T>;
}

export const getRuleExecutionResults = async <TClient extends HttpClient>(
  client: TClient,
  query: GetRuleExecutionResultsRequestQuery,
  signal?: AbortSignal
) => {
  return client.fetch<GetRuleExecutionResultsResponse>(
    '/internal/detection_engine/rules/{ruleId}/execution/results',
    {
      method: 'put',
      version: '1',
      query,
      signal,
    }
  );
};
