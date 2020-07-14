/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FETCH_STATUS } from '../../../hooks/useFetcher';
import { useTransactionBreakdown } from '../../../hooks/useTransactionBreakdown';
import { TransactionBreakdownGraph } from './TransactionBreakdownGraph';
import { TransactionBreakdownKpiList } from './TransactionBreakdownKpiList';

const emptyMessage = i18n.translate('xpack.apm.transactionBreakdown.noData', {
  defaultMessage: 'No data within this time range.',
});

const TransactionBreakdown = () => {
  const { data, status } = useTransactionBreakdown();
  const { kpis, timeseries } = data;
  const noHits = data.kpis.length === 0 && status === FETCH_STATUS.SUCCESS;

  return (
    <EuiPanel>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.apm.transactionBreakdown.chartTitle', {
                defaultMessage: 'Time spent by span type',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {noHits ? (
            <EuiText>{emptyMessage}</EuiText>
          ) : (
            <TransactionBreakdownKpiList kpis={kpis} />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <TransactionBreakdownGraph timeseries={timeseries} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export { TransactionBreakdown };
