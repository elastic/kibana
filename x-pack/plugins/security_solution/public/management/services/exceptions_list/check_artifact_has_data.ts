/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchQueryOptions } from '@tanstack/query-core/src/types';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { securitySolutionQueryClient } from '../../../common/containers/query_client/query_client_provider';
import type { ExceptionsListApiClient } from './exceptions_list_api_client';

/**
 * Checks to see if a given type of artifact has data.
 *
 * Note: this service function will suppress API errors (if any) and return `false` if one is encountered
 *
 * @param artifactApiClient
 * @param queryOptions
 */
export const checkArtifactHasData = (
  artifactApiClient: ExceptionsListApiClient,
  queryOptions: Omit<FetchQueryOptions<boolean, IHttpFetchError>, 'queryFn'> = {}
) => {
  return securitySolutionQueryClient.fetchQuery<boolean, IHttpFetchError>({
    queryKey: ['get-artifact-has-data', artifactApiClient],
    ...queryOptions,
    queryFn: async () => {
      try {
        return await artifactApiClient.hasData();
      } catch (error) {
        window.console.log(error);
        // Ignores possible failures and returns `false` if any exception was encountered
        return false;
      }
    },
  });
};
