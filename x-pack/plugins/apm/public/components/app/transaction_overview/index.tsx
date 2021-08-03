/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { Location } from 'history';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { IUrlParams } from '../../../context/url_params_context/types';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { TransactionCharts } from '../../shared/charts/transaction_charts';
import { fromQuery, toQuery } from '../../shared/Links/url_helpers';
import { TransactionsTable } from '../../shared/transactions_table';
import { useRedirect } from './useRedirect';

function getRedirectLocation({
  location,
  transactionType,
  urlParams,
}: {
  location: Location;
  transactionType?: string;
  urlParams: IUrlParams;
}): Location | undefined {
  const transactionTypeFromUrlParams = urlParams.transactionType;

  if (!transactionTypeFromUrlParams && transactionType) {
    return {
      ...location,
      search: fromQuery({
        ...toQuery(location.search),
        transactionType,
      }),
    };
  }
}

export function TransactionOverview() {
  const location = useLocation();
  const { urlParams } = useUrlParams();
  const { transactionType, serviceName } = useApmServiceContext();

  // redirect to first transaction type
  useRedirect(getRedirectLocation({ location, transactionType, urlParams }));

  // TODO: improve urlParams typings.
  // `serviceName` or `transactionType` will never be undefined here, and this check should not be needed
  if (!serviceName) {
    return null;
  }

  return (
    <>
      <TransactionCharts />
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={true}>
        <TransactionsTable
          hideViewTransactionsLink
          numberOfTransactionsPerPage={25}
          showAggregationAccurateCallout
        />
      </EuiPanel>
    </>
  );
}
