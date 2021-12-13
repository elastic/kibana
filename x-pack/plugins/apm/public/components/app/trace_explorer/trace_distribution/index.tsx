/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TraceDistributionResponse } from '../../../../../server/lib/trace_explorer/trace_distribution_fetcher';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { TransactionDistributionChart } from '../../../shared/charts/transaction_distribution_chart';
import { getTransactionDistributionChartData } from '../../correlations/get_transaction_distribution_chart_data';

export function TraceDistribution({
  foregroundDistributionResponse,
  backgroundDistributionResponse,
  loading,
}: {
  foregroundDistributionResponse?: TraceDistributionResponse;
  backgroundDistributionResponse?: TraceDistributionResponse;
  loading: boolean;
}) {
  const euiTheme = useTheme();

  const transactionDistributionChartData = getTransactionDistributionChartData({
    euiTheme,
    foreground: foregroundDistributionResponse && {
      histogram: foregroundDistributionResponse.overallHistogram || [],
      label: i18n.translate(
        'xpack.apm.traceDistribution.distributionForegroundLabel',
        {
          defaultMessage: 'Foreground',
        }
      ),
    },
    background: backgroundDistributionResponse && {
      histogram: backgroundDistributionResponse.overallHistogram || [],
      label: i18n.translate(
        'xpack.apm.traceDistribution.distributionBackgroundLabel',
        {
          defaultMessage: 'Background',
        }
      ),
    },
  });

  return (
    <EuiFlexGroup direction="column" alignItems="stretch">
      <EuiFlexItem>
        <EuiText>
          <h4>
            {i18n.translate('xpack.apm.traceDistribution.header', {
              defaultMessage: 'Distribution',
            })}
          </h4>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexGroup>
        <EuiFlexItem grow>
          <TransactionDistributionChart
            data={transactionDistributionChartData}
            hasData={
              !!(
                foregroundDistributionResponse || backgroundDistributionResponse
              )
            }
            markerValue={
              foregroundDistributionResponse?.percentileThresholdValue ||
              backgroundDistributionResponse?.percentileThresholdValue ||
              0
            }
            status={loading ? FETCH_STATUS.LOADING : FETCH_STATUS.SUCCESS}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}
