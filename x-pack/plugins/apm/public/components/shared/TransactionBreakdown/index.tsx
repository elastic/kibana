/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React from 'react';
import { FETCH_STATUS } from '../../../hooks/useFetcher';
import { useTransactionBreakdown } from '../../../hooks/useTransactionBreakdown';
import { TransactionBreakdownGraph } from './TransactionBreakdownGraph';

function TransactionBreakdown() {
  const { data, status } = useTransactionBreakdown();
  const { timeseries } = data;
  const noHits = isEmpty(timeseries) && status === FETCH_STATUS.SUCCESS;

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
          <TransactionBreakdownGraph timeseries={timeseries} noHits={noHits} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}

export { TransactionBreakdown };
