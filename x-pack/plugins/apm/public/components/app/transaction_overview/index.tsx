/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { AggregatedTransactionsBadge } from '../../shared/aggregated_transactions_badge';
import { TransactionCharts } from '../../shared/charts/transaction_charts';
import { replace } from '../../shared/links/url_helpers';
import { TransactionsTable } from '../../shared/transactions_table';
import { isServerlessAgent } from '../../../../common/agent_name';

export function TransactionOverview() {
  const {
    query: {
      environment,
      kuery,
      rangeFrom,
      rangeTo,
      transactionType: transactionTypeFromUrl,
      comparisonEnabled,
      comparisonType,
    },
  } = useApmParams('/services/{serviceName}/transactions');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { transactionType, serviceName, fallbackToTransactions, runtimeName } =
    useApmServiceContext();

  const history = useHistory();

  // redirect to first transaction type
  if (!transactionTypeFromUrl && transactionType) {
    replace(history, { query: { transactionType } });
  }

  // TODO: improve urlParams typings.
  // `serviceName` or `transactionType` will never be undefined here, and this check should not be needed
  if (!serviceName) {
    return null;
  }

  const isServerless = isServerlessAgent(runtimeName);

  return (
    <>
      {fallbackToTransactions && (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <AggregatedTransactionsBadge />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}
      <TransactionCharts
        kuery={kuery}
        environment={environment}
        start={start}
        end={end}
        isServerlessContext={isServerless}
        comparisonEnabled={comparisonEnabled}
        comparisonType={comparisonType}
      />
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={true}>
        <TransactionsTable
          hideViewTransactionsLink
          numberOfTransactionsPerPage={25}
          showAggregationAccurateCallout
          environment={environment}
          kuery={kuery}
          start={start}
          end={end}
          saveTableOptionsToUrl
        />
      </EuiPanel>
    </>
  );
}
