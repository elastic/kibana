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
  TooltipContainer,
  CustomTooltip as CustomChartTooltip,
  Tooltip,
} from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBaseChartTheme } from '../../../../../../hooks/use_base_chart_theme';
import { BAR_HEIGHT } from './constants';
import { WaterfallChartChartContainer, WaterfallChartTooltip } from './styles';
import { WaterfallData } from '../../common/network_data/types';
import { useWaterfallContext } from './context/waterfall_context';
import { WaterfallTooltipContent } from './waterfall_tooltip_content';
import { formatTooltipHeading } from '../../common/network_data/data_formatting';
import { WaterfallChartMarkers } from './waterfall_marker/waterfall_markers';

const getChartHeight = (data: WaterfallData): number => {
  // We get the last item x(number of bars) and adds 1 to cater for 0 index
  const noOfXBars = new Set(data.map((item) => item.x)).size;

  return noOfXBars * BAR_HEIGHT;
};

const CustomTooltip: CustomChartTooltip = (tooltipInfo) => {
  const { sidebarItems, metadata } = useWaterfallContext();
  return useMemo(() => {
    const sidebarItem = sidebarItems?.find((item) => item.index === tooltipInfo.header?.value);
    if (!sidebarItem) {
      return null;
    }
    const metadataEntry = metadata?.[sidebarItem.index];
    const showTooltip =
      metadataEntry?.showTooltip && metadataEntry?.networkItemTooltipProps.length > 1;
    return showTooltip ? (
      <TooltipContainer>
        <WaterfallChartTooltip>
          {sidebarItem && (
            <WaterfallTooltipContent
              text={formatTooltipHeading(sidebarItem.offsetIndex, sidebarItem.url)}
              url={sidebarItem.url}
              index={sidebarItem.offsetIndex}
            />
          )}
        </WaterfallChartTooltip>
      </TooltipContainer>
    ) : null;
  }, [sidebarItems, tooltipInfo.header?.value, metadata]);
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
  const baseChartTheme = useBaseChartTheme();
  const { euiTheme } = useEuiTheme();
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
        <Tooltip
          // this is done to prevent the waterfall tooltip from rendering behind Kibana's
          // stacked header when the user highlights an item at the top of the chart
          boundary={document.getElementById('app-fixed-viewport') ?? undefined}
          customTooltip={CustomTooltip}
        />
        <Settings
          showLegend={false}
          rotation={90}
          theme={{ tooltip: { maxWidth: 500 } }}
          // TODO connect to charts.theme service see src/plugins/charts/public/services/theme/README.md
          baseTheme={baseChartTheme}
          onProjectionClick={handleProjectionClick}
          onElementClick={handleElementClick}
          locale={i18n.getLocale()}
        />

        <Axis
          aria-hidden={true}
          id="time"
          position={Position.Top}
          tickFormat={memoizedTickFormat}
          domain={domain}
          gridLine={{
            visible: true,
          }}
          style={{
            axisLine: {
              visible: false,
            },
            tickLabel: {
              fontSize: 12,
              fill: euiTheme.colors.darkestShade,
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
