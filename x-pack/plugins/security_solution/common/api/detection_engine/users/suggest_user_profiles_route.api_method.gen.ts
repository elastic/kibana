/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpFetchOptions } from '@kbn/core-http-browser';
import type {
  SuggestUserProfilesRequestQuery,
  SuggestUserProfilesResponse,
} from './suggest_user_profiles_route.gen';

interface HttpClient {
  fetch<T>(url: string, options: HttpFetchOptions): Promise<T>;
}

export const suggestUserProfiles = async <TClient extends HttpClient>(
  client: TClient,
  query: SuggestUserProfilesRequestQuery,
  signal?: AbortSignal
) => {
  return client.fetch<SuggestUserProfilesResponse>('/internal/detection_engine/users/_find', {
    method: 'post',
    version: '2023-10-31',
    query,
    signal,
  });
};
