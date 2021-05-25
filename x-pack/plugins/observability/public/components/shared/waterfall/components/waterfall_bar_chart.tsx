/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
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
import { BAR_HEIGHT } from './constants';
import { WaterfallChartChartContainer, WaterfallChartTooltip } from './styles';
import { useWaterfallContext, WaterfallData } from '..';
import { useChartTheme } from '../../../../hooks/use_chart_theme';
import { WaterfallCharMarkers } from './waterfall_markers';

const getChartHeight = (data: WaterfallData): number => {
  // We get the last item x(number of bars) and adds 1 to cater for 0 index
  const noOfXBars = new Set(data.map((item) => item.x)).size;

  return noOfXBars * BAR_HEIGHT;
};

function Tooltip(tooltipInfo: TooltipInfo) {
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
          return <EuiFlexItem key={index}>{renderTooltipItem(item)}</EuiFlexItem>;
        })}
      </EuiFlexGroup>
    </WaterfallChartTooltip>
  ) : null;
}

interface Props {
  index: number;
  chartData: WaterfallData;
  tickFormat: TickFormatter;
  domain: DomainRange;
  barStyleAccessor: BarStyleAccessor;
}

export function WaterfallBarChart({
  chartData,
  tickFormat,
  domain,
  barStyleAccessor,
  index,
}: Props) {
  const theme = useChartTheme();
  const { onElementClick, onProjectionClick } = useWaterfallContext();
  const handleElementClick = useMemo(() => onElementClick, [onElementClick]);
  const handleProjectionClick = useMemo(() => onProjectionClick, [onProjectionClick]);
  const memoizedTickFormat = useCallback(tickFormat, [tickFormat]);

  return (
    <WaterfallChartChartContainer
      height={getChartHeight(chartData)}
      chartIndex={index}
      data-test-subj="wfDataOnlyBarChart"
    >
      <Chart className="data-chart">
        <Settings
          showLegend={false}
          rotation={90}
          tooltip={{ customTooltip: Tooltip }}
          theme={{
            barSeriesStyle: {
              displayValue: { fontSize: 16, alignment: { vertical: 'middle' }, offsetX: -65 },
            },
          }}
          onProjectionClick={handleProjectionClick}
          onElementClick={handleElementClick}
        />

        <Axis
          aria-hidden={true}
          id="time"
          position={Position.Top}
          tickFormat={memoizedTickFormat}
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
          yAccessors={['duration']}
          y0Accessors={['offset']}
          styleAccessor={barStyleAccessor}
          data={chartData}
          displayValueSettings={{
            showValueLabel: true,
            isValueContainedInElement: false,
            hideClippedValue: false,
            valueFormatter: (d) => String(d.toFixed(0)) + ' ms',
          }}
        />
        <WaterfallCharMarkers showMark={false} />
      </Chart>
    </WaterfallChartChartContainer>
  );
}
