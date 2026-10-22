/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconTip, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React from 'react';
import type { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import {
  asExactTransactionRate,
  asPercent,
  getDurationFormatter,
} from '../../../../../common/utils/formatters';
import { errorRateI18n } from '../../charts/failed_transaction_rate_chart';
import { LatencyAggregationTypeSelect } from '../../charts/latency_chart/latency_aggregation_type_select';
import { getMaxY, getResponseTimeTickFormatter } from '../../charts/transaction_charts/helper';
import { RequestFlyoutChartsGrid, type RequestFlyoutChart } from '../charts_grid';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { useRequestFlyoutRedMetrics } from './use_request_flyout_red_metrics';

interface Props {
  latencyAggregationType: LatencyAggregationType;
  setLatencyAggregationType: (value: LatencyAggregationType) => void;
}

/** Latency, throughput and failed transaction rate of the calls of the connection. */
export function RequestFlyoutRedMetrics({
  latencyAggregationType,
  setLatencyAggregationType,
}: Props) {
  const { latencyTimeseries, throughputTimeseries, errorRateTimeseries, status, hasError } =
    useRequestFlyoutRedMetrics({ latencyAggregationType });

  const latencyFormatter = getDurationFormatter(getMaxY(latencyTimeseries));

  const charts: RequestFlyoutChart[] = [
    {
      id: 'requestFlyoutLatencyChart',
      title: i18n.translate('xpack.apm.requestFlyout.latencyChartTitle', {
        defaultMessage: 'Latency',
      }),
      titleAction: (
        <LatencyAggregationTypeSelect
          latencyAggregationType={latencyAggregationType}
          onChange={setLatencyAggregationType}
          ebt={{ element: REQUEST_FLYOUT_EBT_ELEMENTS.LATENCY_AGGREGATION }}
        />
      ),
      fetchStatus: status,
      timeseries: latencyTimeseries,
      yLabelFormat: getResponseTimeTickFormatter(latencyFormatter),
    },
    {
      id: 'requestFlyoutThroughputChart',
      title: i18n.translate('xpack.apm.requestFlyout.throughputChartTitle', {
        defaultMessage: 'Throughput',
      }),
      titleTip: (
        <EuiIconTip
          content={i18n.translate('xpack.apm.requestFlyout.throughputHelp', {
            defaultMessage: 'Throughput is measured in spans per minute (spm).',
          })}
          position="right"
        />
      ),
      fetchStatus: status,
      timeseries: throughputTimeseries,
      yLabelFormat: asExactTransactionRate,
    },
    {
      id: 'requestFlyoutErrorRateChart',
      title: i18n.translate('xpack.apm.requestFlyout.errorRateChartTitle', {
        defaultMessage: 'Failed transaction rate',
      }),
      titleTip: <EuiIconTip content={errorRateI18n} position="right" />,
      fetchStatus: status,
      timeseries: errorRateTimeseries,
      yLabelFormat: (y) => asPercent(y || 0, 1),
      yDomain: { min: 0, max: 1 },
    },
  ];

  return (
    <section data-test-subj="requestFlyoutSection-redMetrics">
      {hasError && (
        <>
          <KbnWarningCallout
            size="s"
            data-test-subj="requestFlyoutRedMetricsError"
            title={i18n.translate('xpack.apm.requestFlyout.chartsUnavailable', {
              defaultMessage: 'Unable to load charts',
            })}
          />
          <EuiSpacer size="s" />
        </>
      )}
      <RequestFlyoutChartsGrid charts={charts} />
    </section>
  );
}
