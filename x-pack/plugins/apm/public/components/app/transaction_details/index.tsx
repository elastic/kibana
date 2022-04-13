/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useTimeRange } from '../../../hooks/use_time_range';
import { AggregatedTransactionsBadge } from '../../shared/aggregated_transactions_badge';
import { TransactionCharts } from '../../shared/charts/transaction_charts';
import { replace } from '../../shared/links/url_helpers';
import { TransactionDetailsTabs } from './transaction_details_tabs';
import { isServerlessAgent } from '../../../../common/agent_name';

export function TransactionDetails() {
  const { path, query } = useApmParams(
    '/services/{serviceName}/transactions/view'
  );
  const {
    transactionName,
    rangeFrom,
    rangeTo,
    transactionType: transactionTypeFromUrl,
    comparisonEnabled,
    offset,
  } = query;
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const apmRouter = useApmRouter();
  const { transactionType, fallbackToTransactions, runtimeName } =
    useApmServiceContext();

  const history = useHistory();

  // redirect to first transaction type
  if (!transactionTypeFromUrl && transactionType) {
    replace(history, { query: { transactionType } });
  }

  useBreadcrumb({
    title: transactionName,
    href: apmRouter.link('/services/{serviceName}/transactions/view', {
      path,
      query,
    }),
  });

  const isServerless = isServerlessAgent(runtimeName);

  return (
    <>
      {fallbackToTransactions && <AggregatedTransactionsBadge />}
      <EuiSpacer size="s" />

      <EuiTitle>
        <h2>{transactionName}</h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <ChartPointerEventContextProvider>
        <TransactionCharts
          kuery={query.kuery}
          environment={query.environment}
          start={start}
          end={end}
          transactionName={transactionName}
          isServerlessContext={isServerless}
          comparisonEnabled={comparisonEnabled}
          offset={offset}
        />
      </ChartPointerEventContextProvider>

      <EuiSpacer size="m" />

      <TransactionDetailsTabs />
    </>
  );
}
