/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChartDescriptionButton } from '@kbn/observability-agent-builder-plugin/public';
import React, { useMemo } from 'react';
import { asAbsoluteDateTime, asPercent } from '../../../../../common/utils/formatters';
import { FETCH_STATUS, isPending } from '../../../../hooks/use_fetcher';
import { useAnnotationsContext } from '../../../../context/annotations/use_annotations_context';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { useTransactionBreakdown } from './use_transaction_breakdown';
import { BreakdownChart } from '../breakdown_chart';
import { toChartDescriptionSeries } from '../helper/to_chart_description_series';

const transactionBreakdownChartTitle = i18n.translate('xpack.apm.transactionBreakdown.chartTitle', {
  defaultMessage: 'Time spent by span type',
});

const formatTransactionBreakdownChartTimestamp = (timestamp: number) =>
  asAbsoluteDateTime(timestamp, 'minutes');

const formatTransactionBreakdownValue = (value: number) => asPercent(value, 1);

export function TransactionBreakdownChart({
  height,
  showAnnotations = true,
  environment,
  kuery,
}: {
  height?: number;
  showAnnotations?: boolean;
  environment: string;
  kuery: string;
}) {
  const { data, status } = useTransactionBreakdown({ environment, kuery });
  const { annotations } = useAnnotationsContext();
  const { timeseries } = data;

  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfApmParams('/services/{serviceName}', '/mobile-services/{serviceName}');
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const chartDescriptionSeries = useMemo(
    () => toChartDescriptionSeries(timeseries ?? []),
    [timeseries]
  );

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h3>{transactionBreakdownChartTitle}</h3>
                </EuiTitle>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={i18n.translate('xpack.apm.transactionBreakdown.chartHelp', {
                    defaultMessage:
                      'The average duration of each span type. "app" indicates something was happening within the service. This could mean that the time was spent in application code and not in database or external requests, or that APM agent auto-instrumentation doesn\'t cover the executed code.',
                  })}
                  position="right"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <ChartDescriptionButton
              chartTitle={transactionBreakdownChartTitle}
              series={chartDescriptionSeries}
              start={start}
              end={end}
              timestampFormatter={formatTransactionBreakdownChartTimestamp}
              valueFormatter={formatTransactionBreakdownValue}
              isLoading={isPending(status)}
              hasError={status === FETCH_STATUS.FAILURE}
              dataTestSubj="apmTransactionBreakdownChartDescriptionButton"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <BreakdownChart
            fetchStatus={status}
            height={height}
            annotations={annotations}
            showAnnotations={showAnnotations}
            timeseries={timeseries}
            yAxisType="percentage"
            id="transactionBreakdownChart"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
