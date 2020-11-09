/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
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
// NOTE: The WaterfallChart expects the ThemeProvider to have been setup for styled-components, using the EUI theme. However,
// as some plugins aren't utilising the ThemeProvider, the WaterfallChart sets up the provider itself just incase.
import { EuiThemeProvider } from '../../../../../../../observability/public';
import { useWaterfallContext } from '../context/waterfall_chart';
import {
  WaterfallChartOuterContainer,
  WaterfallChartFixedTopContainer,
  WaterfallChartFixedTopContainerSidebarCover,
  WaterfallChartFixedAxisContainer,
  WaterfallChartSidebarContainer,
  WaterfallChartSidebarContainerInnerPanel,
  WaterfallChartSidebarContainerFlexGroup,
  WaterfallChartSidebarFlexItem,
  WaterfallChartChartContainer,
  WaterfallChartLegendContainer,
  WaterfallChartTooltip,
} from './styles';
import { WaterfallData } from '../types';

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

interface WaterfallChartProps {
  tickFormat: TickFormatter;
  domain: DomainRange;
  barStyleAccessor: BarStyleAccessor;
  renderSidebarItem?: RenderItem;
  renderLegendItem?: RenderItem;
  maxHeight?: number;
}

const getUniqueBars = (data: WaterfallData) => {
  return data.reduce<number[]>((acc, item) => {
    if (acc.indexOf(item.x) === -1) {
      acc.push(item.x);
      return acc;
    } else {
      return acc;
    }
  }, []);
};

const BAR_HEIGHT = 32;
const getChartHeight = (data: WaterfallData): number => getUniqueBars(data).length * BAR_HEIGHT;

const MAIN_GROW_SIZE = 8;
const SIDEBAR_GROW_SIZE = 2;

export const WaterfallChart = ({
  tickFormat,
  domain,
  barStyleAccessor,
  renderSidebarItem,
  renderLegendItem,
  maxHeight = 600,
}: WaterfallChartProps) => {
  const { data, sidebarItems, legendItems } = useWaterfallContext();
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  const theme = useMemo(() => {
    return darkMode ? EUI_CHARTS_THEME_DARK.theme : EUI_CHARTS_THEME_LIGHT.theme;
  }, [darkMode]);

  return (
    <EuiThemeProvider darkMode={darkMode}>
      <WaterfallChartOuterContainer height={maxHeight}>
        <>
          <WaterfallChartFixedTopContainer>
            <EuiFlexGroup gutterSize="none">
              {sidebarItems && sidebarItems.length > 0 && (
                <EuiFlexItem grow={SIDEBAR_GROW_SIZE}>
                  <WaterfallChartFixedTopContainerSidebarCover paddingSize="none" />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={sidebarItems && sidebarItems.length > 0 ? MAIN_GROW_SIZE : true}>
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
                    />

                    <Axis id="values" position={Position.Left} tickFormat={() => ''} />

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
          <EuiFlexGroup gutterSize="none">
            {sidebarItems && sidebarItems.length > 0 && (
              <EuiFlexItem grow={SIDEBAR_GROW_SIZE}>
                <WaterfallChartSidebarContainer height={getChartHeight(data)}>
                  <WaterfallChartSidebarContainerInnerPanel paddingSize="none">
                    <WaterfallChartSidebarContainerFlexGroup direction="column" gutterSize="none">
                      {sidebarItems.map((item, index) => {
                        return (
                          <WaterfallChartSidebarFlexItem key={index}>
                            {renderSidebarItem && renderSidebarItem(item, index)}
                          </WaterfallChartSidebarFlexItem>
                        );
                      })}
                    </WaterfallChartSidebarContainerFlexGroup>
                  </WaterfallChartSidebarContainerInnerPanel>
                </WaterfallChartSidebarContainer>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={sidebarItems && sidebarItems.length > 0 ? MAIN_GROW_SIZE : true}>
              <WaterfallChartChartContainer height={getChartHeight(data)}>
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
                  />

                  <Axis id="values" position={Position.Left} tickFormat={() => ''} />

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
          {legendItems && legendItems.length > 0 && (
            <WaterfallChartLegendContainer>
              <EuiFlexGroup gutterSize="none">
                {legendItems.map((item, index) => {
                  return (
                    <EuiFlexItem key={index}>
                      {renderLegendItem && renderLegendItem(item, index)}
                    </EuiFlexItem>
                  );
                })}
              </EuiFlexGroup>
            </WaterfallChartLegendContainer>
          )}
        </>
      </WaterfallChartOuterContainer>
    </EuiThemeProvider>
  );
};
