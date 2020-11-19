/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useTheme } from '../../../hooks/useTheme';
import { LineChart } from '../../shared/charts/line_chart';

export function ServiceOverviewThroughputChart({
  height,
}: {
  height?: number;
}) {
  const theme = useTheme();
  const throughput = [];
  const status = 'success';

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.apm.serviceOverview.throughtputChartTitle', {
            defaultMessage: 'Traffic',
          })}
        </h2>
      </EuiTitle>
      <LineChart
        id="throughput"
        height={height}
        showAnnotations={false}
        fetchStatus={status}
        timeseries={[
          {
            data: throughput,
            type: 'linemark',
            color: theme.eui.euiColorVis7,
            hideLegend: true,
            title: i18n.translate(
              'xpack.apm.serviceOverview.throughputChart.currentPeriodLabel',
              {
                defaultMessage: 'Current period',
              }
            ),
          },
        ]}
        // yLabelFormat={yLabelFormat}
        // yTickFormat={yTickFormat}
      />
    </EuiPanel>
  );
}
