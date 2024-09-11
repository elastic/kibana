/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { GetInvestigationNotesResponse } from '@kbn/investigation-shared';
import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import { investigationKeys } from './query_key_factory';
import { useKibana } from './use_kibana';

export interface Params {
  investigationId: string;
}

export interface Response {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<GetInvestigationNotesResponse | undefined, unknown>>;
  data: GetInvestigationNotesResponse | undefined;
}

export function useFetchInvestigationNotes({ investigationId }: Params): Response {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: investigationKeys.detailNotes(investigationId),
      queryFn: async ({ signal }) => {
        return await http.get<GetInvestigationNotesResponse>(
          `/api/observability/investigations/${investigationId}/notes`,
          { version: '2023-10-31', signal }
        );
      },
      refetchOnWindowFocus: false,
      refetchInterval: 10 * 1000,
      onError: (error: Error) => {
        toasts.addError(error, {
          title: i18n.translate('xpack.investigateApp.useFetchInvestigationNotes.errorTitle', {
            defaultMessage: 'Something went wrong while fetching investigation notes',
          }),
        });
      },
    }
  );

  return {
    data,
    isInitialLoading,
    isLoading,
    isRefetching,
    isSuccess,
    isError,
    refetch,
  };
}
