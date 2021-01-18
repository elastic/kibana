/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { LatencyAggregationType } from '../../../../../common/latency_aggregation_types';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import { useLicenseContext } from '../../../../context/license/use_license_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useTransactionLatencyChartsFetcher } from '../../../../hooks/use_transaction_latency_chart_fetcher';
import { TimeseriesChart } from '../../../shared/charts/timeseries_chart';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../../../shared/charts/transaction_charts/helper';
import { MLHeader } from '../../../shared/charts/transaction_charts/ml_header';
import * as urlHelpers from '../../../shared/Links/url_helpers';

interface Props {
  height?: number;
}

const options: Array<{ value: LatencyAggregationType; text: string }> = [
  { value: LatencyAggregationType.avg, text: 'Average' },
  { value: LatencyAggregationType.p95, text: '95th percentile' },
  { value: LatencyAggregationType.p99, text: '99th percentile' },
];

export function LatencyChart({ height }: Props) {
  const history = useHistory();
  const { urlParams } = useUrlParams();
  const { latencyAggregationType } = urlParams;
  const license = useLicenseContext();

  const {
    latencyChartsData,
    latencyChartsStatus,
  } = useTransactionLatencyChartsFetcher();

  const { latencyTimeseries, anomalyTimeseries, mlJobId } = latencyChartsData;

  const latencyMaxY = getMaxY(latencyTimeseries);
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
              mlJobId={mlJobId}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <TimeseriesChart
          height={height}
          fetchStatus={latencyChartsStatus}
          id="latencyChart"
          timeseries={latencyTimeseries}
          yLabelFormat={getResponseTimeTickFormatter(latencyFormatter)}
          anomalyTimeseries={anomalyTimeseries}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
