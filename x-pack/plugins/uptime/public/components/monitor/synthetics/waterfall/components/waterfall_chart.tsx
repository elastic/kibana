/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  Axis,
  BarSeries,
  Chart,
  Position,
  ScaleType,
  Settings,
  TickFormatter,
  DomainRange,
  BarStyleAccessor,
  TooltipInfo,
  TooltipType,
} from '@elastic/charts';
import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
// NOTE: The WaterfallChart has a hard requirement that consumers / solutions are making use of KibanaReactContext, and useKibana etc
// can therefore be accessed.
import { useUiSetting$ } from '../../../../../../../../../src/plugins/kibana_react/public';
import { useWaterfallContext } from '../context/waterfall_chart';
import {
  WaterfallChartOuterContainer,
  WaterfallChartFixedTopContainer,
  WaterfallChartFixedTopContainerSidebarCover,
  WaterfallChartFixedAxisContainer,
  WaterfallChartChartContainer,
  WaterfallChartTooltip,
} from './styles';
import { WaterfallData } from '../types';
import { BAR_HEIGHT, CANVAS_MAX_ITEMS, MAIN_GROW_SIZE, SIDEBAR_GROW_SIZE } from './constants';
import { Sidebar } from './sidebar';
import { Legend } from './legend';
import { useBarCharts } from './use_bar_charts';

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

export type RenderItem<I = any> = (item: I, index: number) => JSX.Element;

export interface WaterfallChartProps {
  tickFormat: TickFormatter;
  domain: DomainRange;
  barStyleAccessor: BarStyleAccessor;
  renderSidebarItem?: RenderItem;
  renderLegendItem?: RenderItem;
  maxHeight?: string;
  fullHeight?: boolean;
}

const getChartHeight = (data: WaterfallData, ind: number): number => {
  // We get the last item x(number of bars) and adds 1 to cater for 0 index
  return (data[data.length - 1]?.x + 1 - ind * CANVAS_MAX_ITEMS) * BAR_HEIGHT;
};

export const WaterfallChart = ({
  tickFormat,
  domain,
  barStyleAccessor,
  renderSidebarItem,
  renderLegendItem,
  maxHeight = '800px',
  fullHeight = false,
}: WaterfallChartProps) => {
  const { data, sidebarItems, legendItems } = useWaterfallContext();

  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  const theme = useMemo(() => {
    return darkMode ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme;
  }, [darkMode]);

  const chartWrapperDivRef = useRef<HTMLDivElement | null>(null);

  const [height, setHeight] = useState<string>(maxHeight);

  const shouldRenderSidebar = !!(sidebarItems && sidebarItems.length > 0 && renderSidebarItem);
  const shouldRenderLegend = !!(legendItems && legendItems.length > 0 && renderLegendItem);

  useEffect(() => {
    if (fullHeight && chartWrapperDivRef.current) {
      const chartOffset = chartWrapperDivRef.current.getBoundingClientRect().top;
      setHeight(`calc(100vh - ${chartOffset}px)`);
    }
  }, [chartWrapperDivRef, fullHeight]);

  const chartsToDisplay = useBarCharts({ data });

  return (
    <WaterfallChartOuterContainer height={height}>
      <>
        <WaterfallChartFixedTopContainer>
          <EuiFlexGroup gutterSize="none" responsive={false}>
            {shouldRenderSidebar && (
              <EuiFlexItem grow={SIDEBAR_GROW_SIZE}>
                <WaterfallChartFixedTopContainerSidebarCover paddingSize="none" hasShadow={false} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={shouldRenderSidebar ? MAIN_GROW_SIZE : true}>
              <WaterfallChartFixedAxisContainer>
                <Chart className="axis-only-chart">
                  <Settings
                    showLegend={false}
                    rotation={90}
                    tooltip={{ type: TooltipType.None }}
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
                    data={[{ x: 0, y0: 0, y1: 0 }]}
                  />
                </Chart>
              </WaterfallChartFixedAxisContainer>
            </EuiFlexItem>
          </EuiFlexGroup>
        </WaterfallChartFixedTopContainer>
        <EuiFlexGroup
          gutterSize="none"
          responsive={false}
          style={{ paddingTop: '10px' }}
          ref={chartWrapperDivRef}
        >
          {shouldRenderSidebar && <Sidebar items={sidebarItems!} render={renderSidebarItem!} />}
          <EuiFlexItem grow={shouldRenderSidebar ? MAIN_GROW_SIZE : true}>
            {chartsToDisplay.map((chartData, ind) => (
              <WaterfallChartChartContainer
                height={getChartHeight(chartData, ind)}
                chartIndex={ind}
                key={ind}
              >
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
            ))}
          </EuiFlexItem>
        </EuiFlexGroup>
        {shouldRenderLegend && <Legend items={legendItems!} render={renderLegendItem!} />}
      </>
    </WaterfallChartOuterContainer>
  );
};
