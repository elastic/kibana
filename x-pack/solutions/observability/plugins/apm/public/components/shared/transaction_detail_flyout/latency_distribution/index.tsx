/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import { DurationDistributionChart } from '@kbn/apm-ui-shared';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ChartTitleToolTip } from '../../../app/correlations/chart_title_tool_tip';
import { FETCH_STATUS, isPending } from '../../../../hooks/use_fetcher';
import { TotalDocCountLabel } from '../../charts/duration_distribution_chart/total_doc_count_label';
import { MIN_TAB_TITLE_HEIGHT } from '../../charts/duration_distribution_chart_with_scrubber';
import { useTransactionDetailFlyoutContext } from '../transaction_detail_flyout_context';
import { useTransactionDetailFlyoutDistributionChartData } from './use_transaction_detail_flyout_distribution_chart_data';

export function TransactionDetailFlyoutLatencyDistribution() {
  const { filters } = useTransactionDetailFlyoutContext();
  const { chartData, hasData, percentileThresholdValue, status, totalDocCount } =
    useTransactionDetailFlyoutDistributionChartData(filters);

  // Shared DurationDistributionChart only gates on `loading`. Treat NOT_INITIATED like
  // LOADING (same as APM ChartContainer's isPending) so we don't mount elastic-charts
  // with an empty histogram / NaN y-domain on the first render.
  const loading = isPending(status);

  return (
    <section data-test-subj="transactionDetailFlyoutSection-latencyDistribution">
      <EuiFlexGroup style={{ minHeight: MIN_TAB_TITLE_HEIGHT }} alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h5 data-test-subj="transactionDetailFlyoutLatencyDistributionTitle">
              {i18n.translate('xpack.apm.transactionDetailFlyout.distribution.panelTitle', {
                defaultMessage: 'Latency distribution',
              })}
            </h5>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <ChartTitleToolTip />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <TotalDocCountLabel
            eventType={ProcessorEvent.transaction}
            totalDocCount={totalDocCount}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <DurationDistributionChart
        data={hasData ? chartData : []}
        markerValue={percentileThresholdValue ?? 0}
        hasData={hasData}
        loading={loading}
        hasError={status === FETCH_STATUS.FAILURE}
        eventType={ProcessorEvent.transaction}
        data-test-subj="transactionDetailFlyoutLatencyDistributionChart"
      />
    </section>
  );
}
