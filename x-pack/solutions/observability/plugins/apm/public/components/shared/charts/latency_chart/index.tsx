/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { isTimeComparison } from '../../time_comparison/get_comparison_options';
import { getLatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import { useLicenseContext } from '../../../../context/license/use_license_context';
import { useTransactionLatencyChartsFetcher } from '../../../../hooks/use_transaction_latency_chart_fetcher';
import { TimeseriesChartWithContext } from '../timeseries_chart_with_context';
import { getMaxY, getResponseTimeTickFormatter } from '../transaction_charts/helper';
import { MLHeader } from '../transaction_charts/ml_header';
import * as urlHelpers from '../../links/url_helpers';
import { getComparisonChartTheme } from '../../time_comparison/get_comparison_chart_theme';
import { useEnvironmentsContext } from '../../../../context/environments_context/use_environments_context';
import { AnomalyDetectorType } from '../../../../../common/anomaly_detection/apm_ml_detectors';
import { usePreferredServiceAnomalyTimeseries } from '../../../../hooks/use_preferred_service_anomaly_timeseries';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { getLatencyChartScreenContext } from './get_latency_chart_screen_context';
import { LatencyAggregationTypeSelect } from './latency_aggregation_type_select';
import { OpenInDiscover } from '../../links/discover_links/open_in_discover';

interface Props {
  height?: number;
  kuery: string;
}

export type { Props };

export function filterNil<T>(value: T | null | undefined): value is T {
  return value != null;
}

export function LatencyChart({ height, kuery }: Props) {
  const history = useHistory();

  const comparisonChartTheme = getComparisonChartTheme();
  const license = useLicenseContext();

  const {
    query: { comparisonEnabled, latencyAggregationType, offset, rangeFrom, rangeTo },
    query,
  } = useAnyOfApmParams(
    '/services/{serviceName}/overview',
    '/services/{serviceName}/transactions',
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/overview',
    '/mobile-services/{serviceName}/transactions',
    '/mobile-services/{serviceName}/transactions/view'
  );

  const { environment } = useEnvironmentsContext();

  const { transactionType, serviceName } = useApmServiceContext();

  const transactionName = 'transactionName' in query ? query.transactionName : null;

  const { latencyChartsData, latencyChartsStatus, bucketSizeInSeconds, start, end } =
    useTransactionLatencyChartsFetcher({
      kuery,
      environment,
      transactionName,
      latencyAggregationType: getLatencyAggregationType(latencyAggregationType),
    });

  const { currentPeriod, previousPeriod } = latencyChartsData;

  const preferredAnomalyTimeseries = usePreferredServiceAnomalyTimeseries(
    AnomalyDetectorType.txLatency
  );
  const anomalyTimeseriesColor = previousPeriod?.color as string;

  const timeseries = [
    currentPeriod,
    comparisonEnabled && isTimeComparison(offset) ? previousPeriod : undefined,
  ].filter(filterNil);

  const latencyMaxY = getMaxY(timeseries);
  const latencyFormatter = getDurationFormatter(latencyMaxY);

  const setScreenContext = useApmPluginContext().observabilityAIAssistant?.service.setScreenContext;

  useEffect(() => {
    return setScreenContext?.(
      getLatencyChartScreenContext({
        serviceName,
        transactionName: transactionName ?? undefined,
        transactionType,
        environment,
        bucketSizeInSeconds,
      })
    );
  }, [
    serviceName,
    transactionName,
    transactionType,
    environment,
    setScreenContext,
    bucketSizeInSeconds,
    start,
    end,
  ]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" wrap>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>
                    {i18n.translate('xpack.apm.serviceOverview.latencyChartTitle', {
                      defaultMessage: 'Latency',
                    })}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <LatencyAggregationTypeSelect
                  latencyAggregationType={latencyAggregationType}
                  onChange={(type) => {
                    urlHelpers.push(history, {
                      query: {
                        latencyAggregationType: type,
                      },
                    });
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <OpenInDiscover
                  variant="link"
                  dataTestSubj="apmLatencyChartOpenInDiscover"
                  indexType="traces"
                  rangeFrom={rangeFrom}
                  rangeTo={rangeTo}
                  queryParams={{
                    kuery,
                    serviceName,
                    environment,
                    transactionName: transactionName ?? undefined,
                    transactionType,
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <MLHeader
                  hasValidMlLicense={license?.getFeature('ml').isAvailable}
                  mlJobId={preferredAnomalyTimeseries?.jobId}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <TimeseriesChartWithContext
          height={height}
          fetchStatus={latencyChartsStatus}
          id="latencyChart"
          customTheme={comparisonChartTheme}
          timeseries={timeseries}
          yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
          anomalyTimeseries={
            preferredAnomalyTimeseries
              ? {
                  ...preferredAnomalyTimeseries,
                  color: anomalyTimeseriesColor,
                }
              : undefined
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
