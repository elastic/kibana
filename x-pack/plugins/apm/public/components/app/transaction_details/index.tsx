/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { TransactionCharts } from '../../shared/charts/transaction_charts';

import { TransactionDetailsTabs } from './transaction_details_tabs';

export function TransactionDetails() {
  const { path, query } = useApmParams(
    '/services/:serviceName/transactions/view'
  );
  const { transactionName } = query;

  const apmRouter = useApmRouter();

  useBreadcrumb({
    title: transactionName,
    href: apmRouter.link('/services/:serviceName/transactions/view', {
      path,
      query,
    }),
  });

  return (
    <>
      <EuiSpacer size="s" />

      <EuiTitle>
        <h2>{transactionName}</h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <ChartPointerEventContextProvider>
        <TransactionCharts
          kuery={query.kuery}
          environment={query.environment}
        />
      </ChartPointerEventContextProvider>

      <EuiSpacer size="m" />

      <TransactionDetailsTabs />
    </>
  );
}
