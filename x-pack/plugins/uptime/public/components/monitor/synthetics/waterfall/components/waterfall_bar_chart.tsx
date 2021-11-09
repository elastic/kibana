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
import { BAR_HEIGHT } from './constants';
import { useChartTheme } from '../../../../../hooks/use_chart_theme';
import { WaterfallChartChartContainer, WaterfallChartTooltip } from './styles';
import { useWaterfallContext, WaterfallData } from '..';
import { WaterfallTooltipContent } from './waterfall_tooltip_content';
import { formatTooltipHeading } from '../../step_detail/waterfall/data_formatting';
import { WaterfallChartMarkers } from './waterfall_markers';

const getChartHeight = (data: WaterfallData): number => {
  // We get the last item x(number of bars) and adds 1 to cater for 0 index
  const noOfXBars = new Set(data.map((item) => item.x)).size;

  return noOfXBars * BAR_HEIGHT;
};

const Tooltip = (tooltipInfo: TooltipInfo) => {
  const { data, sidebarItems } = useWaterfallContext();
  return useMemo(() => {
    const sidebarItem = sidebarItems?.find((item) => item.index === tooltipInfo.header?.value);
    const relevantItems = data.filter((item) => {
      return (
        item.x === tooltipInfo.header?.value && item.config.showTooltip && item.config.tooltipProps
      );
    });
    return relevantItems.length ? (
      <WaterfallChartTooltip>
        {sidebarItem && (
          <WaterfallTooltipContent
            text={formatTooltipHeading(sidebarItem.index + 1, sidebarItem.url)}
            url={sidebarItem.url}
          />
        )}
      </WaterfallChartTooltip>
    ) : null;
  }, [data, sidebarItems, tooltipInfo.header?.value]);
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
          tooltip={{
            // this is done to prevent the waterfall tooltip from rendering behind Kibana's
            // stacked header when the user highlights an item at the top of the chart
            boundary: document.getElementById('app-fixed-viewport') ?? undefined,
            customTooltip: Tooltip,
          }}
          theme={theme}
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
          xScaleType={ScaleType.Ordinal}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          y0Accessors={['y0']}
          styleAccessor={barStyleAccessor}
          data={chartData}
        />
        <WaterfallChartMarkers />
      </Chart>
    </WaterfallChartChartContainer>
  );
};
