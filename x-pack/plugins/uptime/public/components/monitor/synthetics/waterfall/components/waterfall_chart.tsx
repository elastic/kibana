/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { TickFormatter, DomainRange, BarStyleAccessor } from '@elastic/charts';

import { useWaterfallContext } from '../context/waterfall_chart';
import {
  WaterfallChartOuterContainer,
  WaterfallChartFixedTopContainer,
  WaterfallChartFixedTopContainerSidebarCover,
  WaterfallChartTopContainer,
  RelativeContainer,
  WaterfallChartFilterContainer,
  WaterfallChartAxisOnlyContainer,
} from './styles';
import { CHART_LEGEND_PADDING, MAIN_GROW_SIZE, SIDEBAR_GROW_SIZE } from './constants';
import { Sidebar } from './sidebar';
import { Legend } from './legend';
import { useBarCharts } from './use_bar_charts';
import { WaterfallBarChart } from './waterfall_bar_chart';
import { WaterfallChartFixedAxis } from './waterfall_chart_fixed_axis';
import { NetworkRequestsTotal } from './network_requests_total';

export type RenderItem<I = any> = (item: I, index?: number) => JSX.Element;
export type RenderFilter = () => JSX.Element;

export interface WaterfallChartProps {
  tickFormat: TickFormatter;
  domain: DomainRange;
  barStyleAccessor: BarStyleAccessor;
  renderSidebarItem?: RenderItem;
  renderLegendItem?: RenderItem;
  renderFilter?: RenderFilter;
  maxHeight?: string;
  fullHeight?: boolean;
}

export const WaterfallChart = ({
  tickFormat,
  domain,
  barStyleAccessor,
  renderSidebarItem,
  renderLegendItem,
  renderFilter,
  maxHeight = '800px',
  fullHeight = false,
}: WaterfallChartProps) => {
  const {
    data,
    sidebarItems,
    legendItems,
    totalNetworkRequests,
    fetchedNetworkRequests,
  } = useWaterfallContext();

  const chartWrapperDivRef = useRef<HTMLDivElement | null>(null);

  const [height, setHeight] = useState<string>(maxHeight);

  const shouldRenderSidebar = !!(sidebarItems && sidebarItems.length > 0 && renderSidebarItem);
  const shouldRenderLegend = !!(legendItems && legendItems.length > 0 && renderLegendItem);

  useEffect(() => {
    if (fullHeight && chartWrapperDivRef.current) {
      const chartOffset = chartWrapperDivRef.current.getBoundingClientRect().top;
      setHeight(`calc(100vh - ${chartOffset + CHART_LEGEND_PADDING}px)`);
    }
  }, [chartWrapperDivRef, fullHeight]);

  const chartsToDisplay = useBarCharts({ data });

  return (
    <RelativeContainer>
      <WaterfallChartFixedTopContainer>
        <WaterfallChartTopContainer gutterSize="none" responsive={false}>
          {shouldRenderSidebar && (
            <EuiFlexItem grow={SIDEBAR_GROW_SIZE}>
              <WaterfallChartFixedTopContainerSidebarCover paddingSize="none" hasShadow={false} />
              <NetworkRequestsTotal
                totalNetworkRequests={totalNetworkRequests}
                fetchedNetworkRequests={fetchedNetworkRequests}
              />
              {renderFilter && (
                <WaterfallChartFilterContainer>{renderFilter()}</WaterfallChartFilterContainer>
              )}
            </EuiFlexItem>
          )}

          <WaterfallChartAxisOnlyContainer
            grow={shouldRenderSidebar ? MAIN_GROW_SIZE : true}
            data-test-subj="axisOnlyWrapper"
          >
            <WaterfallChartFixedAxis
              domain={domain}
              barStyleAccessor={barStyleAccessor}
              tickFormat={tickFormat}
            />
          </WaterfallChartAxisOnlyContainer>
        </WaterfallChartTopContainer>
      </WaterfallChartFixedTopContainer>
      <WaterfallChartOuterContainer height={height} data-test-subj="waterfallOuterContainer">
        <EuiFlexGroup gutterSize="none" responsive={false} ref={chartWrapperDivRef}>
          {shouldRenderSidebar && <Sidebar items={sidebarItems!} render={renderSidebarItem!} />}

          <WaterfallChartAxisOnlyContainer
            grow={shouldRenderSidebar ? MAIN_GROW_SIZE : true}
            data-test-subj="dataOnlyWrapper"
          >
            {chartsToDisplay.map((chartData, ind) => (
              <WaterfallBarChart
                index={ind}
                key={ind}
                chartData={chartData}
                domain={domain}
                barStyleAccessor={barStyleAccessor}
                tickFormat={tickFormat}
              />
            ))}
          </WaterfallChartAxisOnlyContainer>
        </EuiFlexGroup>
      </WaterfallChartOuterContainer>
      {shouldRenderLegend && <Legend items={legendItems!} render={renderLegendItem!} />}
    </RelativeContainer>
  );
};
