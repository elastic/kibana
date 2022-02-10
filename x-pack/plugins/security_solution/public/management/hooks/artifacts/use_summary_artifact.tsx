/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ExceptionListSummarySchema } from '@kbn/securitysolution-io-ts-list-types';
import { QueryObserverResult, useQuery } from 'react-query';
import { ServerApiError } from '../../../common/types';
import { parsePoliciesAndFilterToKql, parseQueryFilterToKQL } from '../../common/utils';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

export function useSummaryArtifact(
  exceptionListApiClient: ExceptionsListApiClient,
  searcheableFields: string[],
  options: {
    filter: string;
    policies: string[];
  } = {
    filter: '',
    policies: [],
  }
): QueryObserverResult<ExceptionListSummarySchema, ServerApiError> {
  const { filter, policies } = options;

  return useQuery<ExceptionListSummarySchema, ServerApiError>(
    ['summary', exceptionListApiClient, options],
    () => {
      return exceptionListApiClient.summary(
        parsePoliciesAndFilterToKql({
          policies,
          kuery: parseQueryFilterToKQL(filter, searcheableFields),
        })
      );
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      keepPreviousData: true,
    }
  );
}
