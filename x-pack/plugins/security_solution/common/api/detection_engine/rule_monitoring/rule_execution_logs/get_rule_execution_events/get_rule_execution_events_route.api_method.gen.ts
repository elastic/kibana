/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchOptions } from '@kbn/core-http-browser';
import type {
  GetRuleExecutionEventsRequestQuery,
  GetRuleExecutionEventsResponse,
} from './get_rule_execution_events_route.gen';

interface HttpClient {
  fetch<T>(url: string, options: HttpFetchOptions): Promise<T>;
}

export const getRuleExecutionEvents = async <TClient extends HttpClient>(
  client: TClient,
  query: GetRuleExecutionEventsRequestQuery,
  signal?: AbortSignal
) => {
  return client.fetch<GetRuleExecutionEventsResponse>(
    '/internal/detection_engine/rules/{ruleId}/execution/events',
    {
      method: 'put',
      version: '1',
      query,
      signal,
    }
  );
};
