/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchOptions } from '@kbn/core-http-browser';
import type {
    DeleteRuleRequestQuery,
  DeleteRuleResponse
} from './delete_rule_route.gen';

interface HttpClient {
  fetch<T>(url: string, options: HttpFetchOptions): Promise<T>;
}

export const deleteRule = async <TClient extends HttpClient>(
  client: TClient, 
  query: DeleteRuleRequestQuery,
  signal?: AbortSignal
) => {
  return client.fetch<DeleteRuleResponse>('/api/detection_engine/rules', {
    method: 'delete', 
    version: '2023-10-31',
    query,
    signal
  });
}  
