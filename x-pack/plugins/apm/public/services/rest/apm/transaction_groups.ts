/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeSeriesAPIResponse } from '../../../../server/lib/transactions/charts';
import { ITransactionDistributionAPIResponse } from '../../../../server/lib/transactions/distribution';
import { TransactionListAPIResponse } from '../../../../server/lib/transactions/get_top_transactions';
import { callApi } from '../callApi';
import { getUiFiltersES } from '../../ui_filters/get_ui_filters_es';
import { UIFilters } from '../../../../typings/ui-filters';

export async function loadTransactionList({
  serviceName,
  start,
  end,
  uiFilters,
  transactionType
}: {
  serviceName: string;
  start: string;
  end: string;
  transactionType: string;
  uiFilters: UIFilters;
}) {
  return await callApi<TransactionListAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transaction_groups/${transactionType}`,
    query: {
      start,
      end,
      uiFiltersES: await getUiFiltersES(uiFilters)
    }
  });
}

export async function loadTransactionDistribution({
  serviceName,
  start,
  end,
  transactionName,
  transactionType,
  transactionId,
  traceId,
  uiFilters
}: {
  serviceName: string;
  start: string;
  end: string;
  transactionType: string;
  transactionName: string;
  transactionId?: string;
  traceId?: string;
  uiFilters: UIFilters;
}) {
  return callApi<ITransactionDistributionAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transaction_groups/${transactionType}/${encodeURIComponent(
      transactionName
    )}/distribution`,
    query: {
      start,
      end,
      transactionId,
      traceId,
      uiFiltersES: await getUiFiltersES(uiFilters)
    }
  });
}

export async function loadTransactionDetailsCharts({
  serviceName,
  start,
  end,
  uiFilters,
  transactionType,
  transactionName
}: {
  serviceName: string;
  start: string;
  end: string;
  transactionType: string;
  transactionName: string;
  uiFilters: UIFilters;
}) {
  return callApi<TimeSeriesAPIResponse>({
    pathname: `/api/apm/services/${serviceName}/transaction_groups/${transactionType}/${encodeURIComponent(
      transactionName
    )}/charts`,
    query: {
      start,
      end,
      uiFiltersES: await getUiFiltersES(uiFilters)
    }
  });
}

export async function loadTransactionOverviewCharts({
  serviceName,
  start,
  end,
  uiFilters,
  transactionType
}: {
  serviceName: string;
  start: string;
  end: string;
  transactionType?: string;
  uiFilters: UIFilters;
}) {
  const pathname = transactionType
    ? `/api/apm/services/${serviceName}/transaction_groups/${transactionType}/charts`
    : `/api/apm/services/${serviceName}/transaction_groups/charts`;

  return callApi<TimeSeriesAPIResponse>({
    pathname,
    query: {
      start,
      end,
      uiFiltersES: await getUiFiltersES(uiFilters)
    }
  });
}
