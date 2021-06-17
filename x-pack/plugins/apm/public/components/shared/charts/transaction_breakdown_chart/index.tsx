/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useTransactionBreakdown } from './use_transaction_breakdown';
import { TransactionBreakdownChartContents } from './transaction_breakdown_chart_contents';

export function TransactionBreakdownChart({
  height,
  showAnnotations = true,
}: {
  height?: number;
  showAnnotations?: boolean;
}) {
  const { data, status } = useTransactionBreakdown();
  const { timeseries } = data;

  return (
    <EuiPanel hasBorder={true}>
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
          <TransactionBreakdownChartContents
            fetchStatus={status}
            height={height}
            showAnnotations={showAnnotations}
            timeseries={timeseries}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
