/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  BubbleSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  TooltipProps,
  TooltipType,
} from '@elastic/charts';
import { EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useChartTheme } from '../../../../../../observability/public';
import {
  asTransactionRate,
  getDurationFormatter,
} from '../../../../../common/utils/formatters';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { ChartContainer } from '../chart_container';
import { getResponseTimeTickFormatter } from '../transaction_charts/helper';

export interface InstancesLatencyDistributionChartProps {
  height: number;
  items?: APIReturnType<'GET /api/apm/services/{serviceName}/service_overview_instances/primary_statistics'>;
  status: FETCH_STATUS;
}

export function InstancesLatencyDistributionChart({
  height,
  items = [],
  status,
}: InstancesLatencyDistributionChartProps) {
  const hasData = items.length > 0;

  const theme = useTheme();
  const chartTheme = {
    ...useChartTheme(),
    bubbleSeriesStyle: {
      point: { strokeWidth: 0, fill: theme.eui.euiColorVis1, radius: 4 },
    },
  };

  const tooltip: TooltipProps = {
    type: TooltipType.Follow,
    snap: false,
    // TODO: Tooltips!
    // headerFormatter: (args) => {
    //   console.log('headerFormatter', args);
    //   return <>hi</>;
    // },
    // customTooltip: (args) => {
    //   console.log('customTooltip', args);
    //   return <>hi</>;
    // },
  };
  const maxLatency = Math.max(...items.map((item) => item.latency ?? 0));
  const latencyFormatter = getDurationFormatter(maxLatency);

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.apm.instancesLatencyDistributionChartTitle', {
            defaultMessage: 'Instances latency distribution',
          })}
        </h2>
      </EuiTitle>
      <ChartContainer hasData={hasData} height={height} status={status}>
        <Chart id="instances-latency-distribution">
          <Settings
            legendPosition={Position.Bottom}
            tooltip={tooltip}
            showLegend
            theme={chartTheme}
          />
          <BubbleSeries
            color={theme.eui.euiColorVis1}
            data={items}
            id={i18n.translate(
              'xpack.apm.instancesLatencyDistributionChartLegend',
              { defaultMessage: 'Instances' }
            )}
            xAccessor={(item) => item.throughput}
            xScaleType={ScaleType.Linear}
            yAccessors={[(item) => item.latency]}
            yScaleType={ScaleType.Linear}
          />
          <Axis
            id="x-axis"
            labelFormat={asTransactionRate}
            position={Position.Bottom}
          />
          <Axis
            id="y-axis"
            labelFormat={getResponseTimeTickFormatter(latencyFormatter)}
            position={Position.Left}
            ticks={3}
          />
        </Chart>
      </ChartContainer>
    </EuiPanel>
  );
}
