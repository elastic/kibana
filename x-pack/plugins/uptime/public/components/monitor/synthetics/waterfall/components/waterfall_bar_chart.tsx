/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  Axis,
  BarSeries,
  BarStyleAccessor,
  Chart,
  DomainRange,
  Position,
  ScaleType,
  Settings,
  TickFormatter,
  TooltipInfo,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { BAR_HEIGHT, CANVAS_MAX_ITEMS } from './constants';
import { useChartTheme } from '../../../../../hooks/use_chart_theme';
import { WaterfallChartChartContainer, WaterfallChartTooltip } from './styles';
import { useWaterfallContext, WaterfallData } from '..';

const getChartHeight = (data: WaterfallData, ind: number): number => {
  // We get the last item x(number of bars) and adds 1 to cater for 0 index
  return (data[data.length - 1]?.x + 1 - ind * CANVAS_MAX_ITEMS) * BAR_HEIGHT;
};

const Tooltip = (tooltipInfo: TooltipInfo) => {
  const { data, renderTooltipItem } = useWaterfallContext();
  const relevantItems = data.filter((item) => {
    return (
      item.x === tooltipInfo.header?.value && item.config.showTooltip && item.config.tooltipProps
    );
  });
  return relevantItems.length ? (
    <WaterfallChartTooltip>
      <EuiFlexGroup direction="column" gutterSize="none">
        {relevantItems.map((item, index) => {
          return (
            <EuiFlexItem key={index}>{renderTooltipItem(item.config.tooltipProps)}</EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </WaterfallChartTooltip>
  ) : null;
};

interface Props {
  index: number;
  chartData: WaterfallData;
  tickFormat: TickFormatter;
  domain: DomainRange;
  barStyleAccessor: BarStyleAccessor;
}

export const WaterfallBarChart = ({
  chartData,
  tickFormat,
  domain,
  barStyleAccessor,
  index,
}: Props) => {
  const theme = useChartTheme();

  return (
    <WaterfallChartChartContainer height={getChartHeight(chartData, index)} chartIndex={index}>
      <Chart className="data-chart">
        <Settings
          showLegend={false}
          rotation={90}
          tooltip={{ customTooltip: Tooltip }}
          theme={theme}
        />

        <Axis
          id="time"
          position={Position.Top}
          tickFormat={tickFormat}
          domain={domain}
          showGridLines={true}
          style={{
            axisLine: {
              visible: false,
            },
          }}
        />

        <BarSeries
          id="waterfallItems"
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          y0Accessors={['y0']}
          styleAccessor={barStyleAccessor}
          data={chartData}
        />
      </Chart>
    </WaterfallChartChartContainer>
  );
};
