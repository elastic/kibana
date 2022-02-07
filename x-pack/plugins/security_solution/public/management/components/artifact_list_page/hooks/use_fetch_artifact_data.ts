/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryObserverResult } from 'react-query';
import type { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useState } from 'react';
import { Pagination } from '@elastic/eui';
import { useFetchHostIsolationExceptionsList } from '../../../pages/host_isolation_exceptions/view/hooks';
import type { ServerApiError } from '../../../../common/types';
import { useIsMounted } from '../../hooks/use_is_mounted';
import {
  MANAGEMENT_DEFAULT_PAGE_SIZE,
  MANAGEMENT_PAGE_SIZE_OPTIONS,
} from '../../../common/constants';
import { useUrlParams } from './use_url_params';

interface ListPagingUrlParams {
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: string;
  filter?: string;
}

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
  apiClient: unknown /* FIXME:PT type should be: ExceptionsListApiClient */
): WithArtifactListDataInterface => {
  const isMounted = useIsMounted();

  const {
    urlParams: { page = 1, perPage = MANAGEMENT_DEFAULT_PAGE_SIZE, sortOrder, sortField, filter },
  } = useUrlParams<ListPagingUrlParams>();

  const [uiPagination] = useState<Pagination>({
    totalItemCount: 0,
    pageSize: perPage,
    pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
    pageIndex: page - 1,
  });

  const [isPageInitializing] = useState(false /* true */); // FIXME:PT set to `true` once we have code for it
  const [doesDataExist] = useState(true /* false */); // FIXME:PT set to `false` once we have code for it

  return {
    isPageInitializing,
    doesDataExist,
    uiPagination,
    ...useFetchHostIsolationExceptionsList({ page, perPage, sortOrder, sortField, filter }),
  };
};
