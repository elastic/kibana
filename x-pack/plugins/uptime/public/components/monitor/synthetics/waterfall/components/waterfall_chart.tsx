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
import { BAR_HEIGHT, MAIN_GROW_SIZE, SIDEBAR_GROW_SIZE, FIXED_AXIS_HEIGHT } from './constants';
import { Sidebar } from './sidebar';
import { Legend } from './legend';

const Tooltip = ({ header }: TooltipInfo) => {
  const { data, renderTooltipItem } = useWaterfallContext();
  const relevantItems = data.filter((item) => {
    return item.x === header?.value;
  });
  return (
    <WaterfallChartTooltip>
      <EuiFlexGroup direction="column" gutterSize="none">
        {relevantItems.map((item, index) => {
          return (
            <EuiFlexItem key={index}>{renderTooltipItem(item.config.tooltipProps)}</EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </WaterfallChartTooltip>
  );
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

const getUniqueBars = (data: WaterfallData) => {
  return (data ?? []).reduce<Set<number>>((acc, item) => {
    if (!acc.has(item.x)) {
      acc.add(item.x);
      return acc;
    } else {
      return acc;
    }
  }, new Set());
};

const getChartHeight = (data: WaterfallData): number =>
  getUniqueBars(data).size * BAR_HEIGHT + FIXED_AXIS_HEIGHT;

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

  const generatedHeight = useMemo(() => {
    return getChartHeight(data);
  }, [data]);

  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  const theme = useMemo(() => {
    return darkMode ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme;
  }, [darkMode]);

  const chartWrapperDivRef = useRef<HTMLDivElement | null>(null);

  const [height, setHeight] = useState<string>(maxHeight);

  const shouldRenderSidebar =
    sidebarItems && sidebarItems.length > 0 && renderSidebarItem ? true : false;
  const shouldRenderLegend =
    legendItems && legendItems.length > 0 && renderLegendItem ? true : false;

  useEffect(() => {
    if (fullHeight && chartWrapperDivRef.current) {
      const chartOffset = chartWrapperDivRef.current.getBoundingClientRect().top;
      setHeight(`calc(100vh - ${chartOffset}px)`);
    }
  }, [chartWrapperDivRef, fullHeight]);

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
          {shouldRenderSidebar && (
            <Sidebar items={sidebarItems!} height={generatedHeight} render={renderSidebarItem!} />
          )}
          <EuiFlexItem grow={shouldRenderSidebar ? MAIN_GROW_SIZE : true}>
            <WaterfallChartChartContainer height={generatedHeight}>
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
                  data={data}
                />
              </Chart>
            </WaterfallChartChartContainer>
          </EuiFlexItem>
        </EuiFlexGroup>
        {shouldRenderLegend && <Legend items={legendItems!} render={renderLegendItem!} />}
      </>
    </WaterfallChartOuterContainer>
  );
};
