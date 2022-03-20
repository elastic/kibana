/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ExceptionListSummarySchema } from '@kbn/securitysolution-io-ts-list-types';
import { HttpFetchError } from 'kibana/public';
import { QueryObserverResult, useQuery, UseQueryOptions } from 'react-query';
import { parsePoliciesAndFilterToKql, parseQueryFilterToKQL } from '../../common/utils';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

const DEFAULT_OPTIONS = Object.freeze({});

export function useSummaryArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  searchableFields: string[],
  options: {
    filter: string;
    policies: string[];
  } = {
    filter: '',
    policies: [],
  },
  customQueryOptions: UseQueryOptions<ExceptionListSummarySchema, HttpFetchError> = DEFAULT_OPTIONS
): QueryObserverResult<ExceptionListSummarySchema, HttpFetchError> {
  const { filter, policies } = options;

  return useQuery<ExceptionListSummarySchema, HttpFetchError>(
    ['summary', exceptionListApiClient, options],
    () => {
      return exceptionListApiClient.summary(
        parsePoliciesAndFilterToKql({
          policies,
          kuery: parseQueryFilterToKQL(filter, searchableFields),
        })
      );
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      keepPreviousData: true,
      ...customQueryOptions,
    }
  );
}
