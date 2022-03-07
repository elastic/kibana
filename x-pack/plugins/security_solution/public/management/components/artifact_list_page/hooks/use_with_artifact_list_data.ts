/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryObserverResult } from 'react-query';
import type { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useEffect, useMemo, useState } from 'react';
import { Pagination } from '@elastic/eui';
import { useQuery } from 'react-query';
import type { ServerApiError } from '../../../../common/types';
import { useIsMounted } from '../../hooks/use_is_mounted';
import {
  MANAGEMENT_DEFAULT_PAGE_SIZE,
  MANAGEMENT_PAGE_SIZE_OPTIONS,
} from '../../../common/constants';
import { useUrlParams } from './use_url_params';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { ArtifactListPageUrlParams } from '../types';
import { MaybeImmutable } from '../../../../../common/endpoint/types';
import { useKueryFromExceptionsSearchFilter } from './use_kuery_from_exceptions_search_filter';

type WithArtifactListDataInterface = QueryObserverResult<
  FoundExceptionListItemSchema,
  ServerApiError
> & {
  /**
   * Set to true during initialization of the page until it can be determined if either data exists.
   * This should drive the showing of the overall page loading state if set to `true`
   */
  isPageInitializing: boolean;

  /**
   * Indicates if the exception list has any data at all (regardless of filters the user might have used)
   */
  doesDataExist: boolean;

  /**
   * The UI pagination data based on the data retrieved for the list
   */
  uiPagination: Pagination;
};

export const useWithArtifactListData = (
  apiClient: ExceptionsListApiClient,
  searchableFields: MaybeImmutable<string[]>
): WithArtifactListDataInterface => {
  const isMounted = useIsMounted();

  const {
    urlParams: {
      page = 1,
      pageSize = MANAGEMENT_DEFAULT_PAGE_SIZE,
      sortOrder,
      sortField,
      filter,
      includedPolicies,
    },
  } = useUrlParams<ArtifactListPageUrlParams>();

  const kuery = useKueryFromExceptionsSearchFilter(filter, searchableFields, includedPolicies);

  const {
    data: doesDataExist,
    isFetching: isLoadingDataExists,
    refetch: checkIfDataExists,
  } = useQuery<boolean, ServerApiError>(
    ['does-data-exists', apiClient],
    async () => apiClient.hasData(),
    {
      enabled: true,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  const [uiPagination, setUiPagination] = useState<Pagination>({
    totalItemCount: 0,
    pageSize,
    pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
    pageIndex: page - 1,
  });

  const [isPageInitializing, setIsPageInitializing] = useState(true);

  const listDataRequest = useQuery<FoundExceptionListItemSchema, ServerApiError>(
    ['list', apiClient, page, pageSize, sortField, sortField, kuery],
    async () => apiClient.find({ page, perPage: pageSize, filter: kuery, sortField, sortOrder }),
    {
      enabled: true,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  const {
    data: listData,
    isFetching: isLoadingListData,
    error: listDataError,
    isSuccess: isSuccessListData,
  } = listDataRequest;

  // Once we know if data exists, update the page initializing state.
  // This should only ever happen at most once;
  useEffect(() => {
    if (isMounted) {
      if (isPageInitializing === true && !isLoadingDataExists) {
        setIsPageInitializing(false);
      }
    }
  }, [isLoadingDataExists, isMounted, isPageInitializing]);

  // Update the uiPagination once the query succeeds
  useEffect(() => {
    if (isMounted && listData && !isLoadingListData && isSuccessListData) {
      setUiPagination((prevState) => {
        return {
          ...prevState,
          pageIndex: listData.page - 1,
          pageSize: listData.per_page,
          totalItemCount: listData.total,
        };
      });
    }
  }, [isLoadingListData, isMounted, isSuccessListData, listData]);

  // Keep the `doesDataExist` updated if we detect that list data result total is zero.
  // Anytime:
  //    1. the list data total is 0
  //    2. and page is 1
  //    3. and filter is empty
  //    4. and doesDataExists is currently set to true
  // check if data exists again
  useEffect(() => {
    if (
      isMounted &&
      !isLoadingListData &&
      !listDataError &&
      listData &&
      listData.total === 0 &&
      String(page) === '1' &&
      !kuery &&
      doesDataExist
    ) {
      checkIfDataExists();
    }
  }, [
    checkIfDataExists,
    doesDataExist,
    filter,
    includedPolicies,
    isLoadingListData,
    isMounted,
    kuery,
    listData,
    listDataError,
    page,
  ]);

  return useMemo(
    () => ({
      isPageInitializing,
      doesDataExist: doesDataExist ?? false,
      uiPagination,
      ...listDataRequest,
    }),
    [doesDataExist, isPageInitializing, listDataRequest, uiPagination]
  );
};
