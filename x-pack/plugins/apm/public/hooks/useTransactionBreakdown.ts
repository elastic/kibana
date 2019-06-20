/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { useMemo } from 'react';
import { IUrlParams } from '../context/UrlParamsContext/types';
import { useUiFilters } from '../context/UrlParamsContext';
import { useFetcher } from './useFetcher';
import { callApi } from '../services/rest/callApi';
import { getUiFiltersES } from '../services/ui_filters/get_ui_filters_es';
import { TransactionBreakdownAPIResponse } from '../../server/lib/transactions/breakdown';

export function useTransactionBreakdown(urlParams: IUrlParams) {
  const { serviceName, start, end, transactionName } = urlParams;

  const uiFilters = useUiFilters(urlParams);

  const { data, error, status } = useFetcher(
    async () => {
      if (serviceName && start && end) {
        return callApi<TransactionBreakdownAPIResponse>({
          pathname: `/api/apm/services/${serviceName}/transaction_groups/breakdown`,
          query: {
            start,
            end,
            transactionName,
            uiFiltersES: await getUiFiltersES(uiFilters)
          }
        });
      }
    },
    [serviceName, start, end, uiFilters]
  );

  return {
    data,
    status,
    error
  };
}
