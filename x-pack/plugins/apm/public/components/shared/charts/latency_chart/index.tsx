/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import { useLicenseContext } from '../../../../context/license/use_license_context';
import { useTransactionLatencyChartsFetcher } from '../../../../hooks/use_transaction_latency_chart_fetcher';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../../../shared/charts/transaction_charts/helper';
import { MLHeader } from '../../../shared/charts/transaction_charts/ml_header';
import * as urlHelpers from '../../../shared/links/url_helpers';
import { getComparisonChartTheme } from '../../time_comparison/get_time_range_comparison';
import { useEnvironmentsContext } from '../../../../context/environments_context/use_environments_context';
import { ApmMlDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';
import { usePreferredServiceAnomalyTimeseries } from '../../../../hooks/use_preferred_service_anomaly_timeseries';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';

interface Props {
  height?: number;
  kuery: string;
}

const options: Array<{ value: LatencyAggregationType; text: string }> = [
  { value: LatencyAggregationType.avg, text: 'Average' },
  { value: LatencyAggregationType.p95, text: '95th percentile' },
  { value: LatencyAggregationType.p99, text: '99th percentile' },
];

function filterNil<T>(value: T | null | undefined): value is T {
  return value != null;
}

export function LatencyChart({ height, kuery }: Props) {
  const history = useHistory();

  const comparisonChartTheme = getComparisonChartTheme();
  const license = useLicenseContext();

  const {
    query: { comparisonEnabled, latencyAggregationType },
  } = useAnyOfApmParams(
    '/services/{serviceName}/overview',
    '/services/{serviceName}/transactions',
    '/services/{serviceName}/transactions/view'
  );

  const { environment } = useEnvironmentsContext();

  const { latencyChartsData, latencyChartsStatus } =
    useTransactionLatencyChartsFetcher({
      kuery,
      environment,
    });

  const { currentPeriod, previousPeriod } = latencyChartsData;

  const preferredAnomalyTimeseries = usePreferredServiceAnomalyTimeseries(
    ApmMlDetectorType.txLatency
  );

  const timeseries = [
    currentPeriod,
    comparisonEnabled ? previousPeriod : undefined,
  ].filter(filterNil);

  const latencyMaxY = getMaxY(timeseries);
  const latencyFormatter = getDurationFormatter(latencyMaxY);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate(
                      'xpack.apm.serviceOverview.latencyChartTitle',
                      {
                        defaultMessage: 'Latency',
                      }
                    )}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSelect
                  compressed
                  prepend={i18n.translate(
                    'xpack.apm.serviceOverview.latencyChartTitle.prepend',
                    { defaultMessage: 'Metric' }
                  )}
                  options={options}
                  value={latencyAggregationType}
                  onChange={(nextOption) => {
                    urlHelpers.push(history, {
                      query: {
                        latencyAggregationType: nextOption.target.value,
                      },
                    });
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <MLHeader
              hasValidMlLicense={license?.getFeature('ml').isAvailable}
              mlJobId={preferredAnomalyTimeseries?.jobId}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <TimeseriesChart
          height={height}
          fetchStatus={latencyChartsStatus}
          id="latencyChart"
          customTheme={comparisonChartTheme}
          timeseries={timeseries}
          yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
          anomalyTimeseries={preferredAnomalyTimeseries}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
