/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GetInvestigationItemsResponse,
  InvestigationItemResponse,
} from '@kbn/investigation-shared';
import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { investigationKeys } from './query_key_factory';
import { useKibana } from './use_kibana';

export interface Params {
  investigationId: string;
  initialItems?: InvestigationItemResponse[];
}

export interface Response {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<GetInvestigationItemsResponse | undefined, unknown>>;
  data: GetInvestigationItemsResponse | undefined;
}

export function useFetchInvestigationItems({ investigationId, initialItems }: Params): Response {
  const {
    core: {
      http,
      notifications: { toasts },
    },
  } = useKibana();

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: investigationKeys.detailItems(investigationId),
      queryFn: async ({ signal }) => {
        return await http.get<GetInvestigationItemsResponse>(
          `/api/observability/investigations/${investigationId}/items`,
          { version: '2023-10-31', signal }
        );
      },
      // initialData: initialItems,
      refetchOnWindowFocus: false,
      refetchInterval: 10 * 1000,
      refetchIntervalInBackground: true,
      onError: (error: Error) => {
        toasts.addError(error, {
          title: i18n.translate('xpack.investigateApp.useFetchInvestigationItems.errorTitle', {
            defaultMessage: 'Something went wrong while fetching investigation items',
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
