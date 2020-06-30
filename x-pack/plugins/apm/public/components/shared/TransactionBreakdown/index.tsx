/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useTransactionBreakdown } from '../../../hooks/useTransactionBreakdown';
import { TransactionBreakdownHeader } from './TransactionBreakdownHeader';
import { TransactionBreakdownKpiList } from './TransactionBreakdownKpiList';
import { TransactionBreakdownGraph } from './TransactionBreakdownGraph';
import { FETCH_STATUS } from '../../../hooks/useFetcher';
import { useUiTracker } from '../../../../../observability/public';

const emptyMessage = i18n.translate('xpack.apm.transactionBreakdown.noData', {
  defaultMessage: 'No data within this time range.',
});

const TransactionBreakdown: React.FC<{
  initialIsOpen?: boolean;
}> = ({ initialIsOpen }) => {
  const [showChart, setShowChart] = useState(!!initialIsOpen);
  const { data, status } = useTransactionBreakdown();
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const { kpis, timeseries } = data;
  const noHits = data.kpis.length === 0 && status === FETCH_STATUS.SUCCESS;
  const showEmptyMessage = noHits && !showChart;

  return (
    <EuiPanel>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <TransactionBreakdownHeader
            showChart={showChart}
            onToggleClick={() => {
              setShowChart(!showChart);
              if (showChart) {
                trackApmEvent({ metric: 'hide_breakdown_chart' });
              } else {
                trackApmEvent({ metric: 'show_breakdown_chart' });
              }
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {showEmptyMessage ? (
            <EuiText>{emptyMessage}</EuiText>
          ) : (
            <TransactionBreakdownKpiList kpis={kpis} />
          )}
        </EuiFlexItem>
        {showChart ? (
          <EuiFlexItem grow={false}>
            <TransactionBreakdownGraph timeseries={timeseries} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export { TransactionBreakdown };
