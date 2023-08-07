/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { TickFormatter, DomainRange, BarStyleAccessor } from '@elastic/charts';
import useWindowSize from 'react-use/lib/useWindowSize';
import { useWaterfallContext } from '../context/waterfall_chart';
import {
  WaterfallChartOuterContainer,
  WaterfallChartFixedTopContainer,
  WaterfallChartFixedTopContainerSidebarCover,
  WaterfallChartSidebarWrapper,
  WaterfallChartTopContainer,
  RelativeContainer,
  WaterfallChartFilterContainer,
  WaterfallChartAxisOnlyContainer,
  WaterfallChartLegendContainer,
} from './styles';
import { CHART_LEGEND_PADDING, MAIN_GROW_SIZE, SIDEBAR_GROW_SIZE } from './constants';
import { Sidebar } from './sidebar';
import { Legend } from './legend';
import { useBarCharts } from './use_bar_charts';
import { WaterfallBarChart } from './waterfall_bar_chart';
import { WaterfallChartFixedAxis } from './waterfall_chart_fixed_axis';
import { NetworkRequestsTotal } from './network_requests_total';

export type RenderItem<I = any> = (
  item: I,
  index: number,
  onClick?: (event: any) => void
) => JSX.Element;
export type RenderElement = () => JSX.Element;

export interface WaterfallChartProps {
  tickFormat: TickFormatter;
  domain: DomainRange;
  barStyleAccessor: BarStyleAccessor;
  renderSidebarItem?: RenderItem;
  renderLegendItem?: RenderItem;
  renderFilter?: RenderElement;
  renderFlyout?: RenderElement;
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
  renderFlyout,
  maxHeight = '800px',
  fullHeight = false,
}: WaterfallChartProps) => {
  const {
    data,
    showOnlyHighlightedNetworkRequests,
    sidebarItems,
    legendItems,
    totalNetworkRequests,
    highlightedNetworkRequests,
    fetchedNetworkRequests,
  } = useWaterfallContext();

  const { width } = useWindowSize();

  const chartWrapperDivRef = useRef<HTMLDivElement | null>(null);
  const legendDivRef = useRef<HTMLDivElement | null>(null);

  const [height, setHeight] = useState<string>(maxHeight);

  const shouldRenderSidebar = !!(sidebarItems && renderSidebarItem);
  const shouldRenderLegend = !!(legendItems && legendItems.length > 0 && renderLegendItem);

  useEffect(() => {
    if (fullHeight && chartWrapperDivRef.current && legendDivRef.current) {
      const chartOffset = chartWrapperDivRef.current.getBoundingClientRect().top;
      const legendOffset = legendDivRef.current.getBoundingClientRect().height;
      setHeight(`calc(100vh - ${chartOffset + CHART_LEGEND_PADDING + legendOffset}px)`);
    }
  }, [chartWrapperDivRef, fullHeight, legendDivRef, width]);

  const chartsToDisplay = useBarCharts({ data });

  return (
    <RelativeContainer>
      <WaterfallChartFixedTopContainer>
        <WaterfallChartTopContainer gutterSize="none" responsive={false}>
          {shouldRenderSidebar && (
            <WaterfallChartSidebarWrapper grow={SIDEBAR_GROW_SIZE}>
              <WaterfallChartFixedTopContainerSidebarCover paddingSize="none" hasShadow={false} />
              <NetworkRequestsTotal
                totalNetworkRequests={totalNetworkRequests}
                highlightedNetworkRequests={highlightedNetworkRequests}
                fetchedNetworkRequests={fetchedNetworkRequests}
                showHighlightedNetworkRequests={showOnlyHighlightedNetworkRequests}
              />
              {renderFilter && (
                <WaterfallChartFilterContainer>{renderFilter()}</WaterfallChartFilterContainer>
              )}
            </WaterfallChartSidebarWrapper>
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
      <WaterfallChartOuterContainer
        height={height}
        data-test-subj="waterfallOuterContainer"
        ref={chartWrapperDivRef}
      >
        <EuiFlexGroup gutterSize="none" responsive={false}>
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
      {shouldRenderLegend && (
        <WaterfallChartLegendContainer ref={legendDivRef}>
          <Legend items={legendItems!} render={renderLegendItem!} />
        </WaterfallChartLegendContainer>
      )}
      {renderFlyout && renderFlyout()}
    </RelativeContainer>
  );
};
