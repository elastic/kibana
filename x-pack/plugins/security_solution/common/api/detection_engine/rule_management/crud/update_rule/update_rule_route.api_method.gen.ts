/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchOptions } from '@kbn/core-http-browser';
import type {
    UpdateRuleRequestBody,
  UpdateRuleResponse
} from './update_rule_route.gen';

interface HttpClient {
  fetch<T>(url: string, options: HttpFetchOptions): Promise<T>;
}

export const updateRule = async <TClient extends HttpClient>(
  client: TClient, 
  params: UpdateRuleRequestBody, 
  signal?: AbortSignal
) => {
  return client.fetch<UpdateRuleResponse>('/api/detection_engine/rules', {
    method: 'put', 
    version: '2023-10-31',
      body: JSON.stringify(params),
    signal
  });
}  
