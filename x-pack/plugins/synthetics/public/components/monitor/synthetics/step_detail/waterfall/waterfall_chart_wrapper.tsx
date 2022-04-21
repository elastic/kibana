/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiHealth } from '@elastic/eui';
import { useTrackMetric, METRIC_TYPE } from '@kbn/observability-plugin/public';
import { getSeriesAndDomain, getSidebarItems, getLegendItems } from './data_formatting';
import { SidebarItem, LegendItem, NetworkItems } from './types';
import { WaterfallProvider, WaterfallChart, RenderItem, useFlyout } from '../../waterfall';
import { WaterfallFilter } from './waterfall_filter';
import { WaterfallFlyout } from './waterfall_flyout';
import { WaterfallSidebarItem } from './waterfall_sidebar_item';
import { MarkerItems } from '../../waterfall/context/waterfall_chart';
import { JourneyStep } from '../../../../../../common/runtime_types';

export const renderLegendItem: RenderItem<LegendItem> = (item) => {
  return (
    <EuiHealth color={item.colour} className="eui-textNoWrap">
      {item.name}
    </EuiHealth>
  );
};

interface Props {
  total: number;
  activeStep?: JourneyStep;
  data: NetworkItems;
  markerItems?: MarkerItems;
}

export const WaterfallChartWrapper: React.FC<Props> = ({
  data,
  total,
  markerItems,
  activeStep,
}) => {
  const [query, setQuery] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [onlyHighlighted, setOnlyHighlighted] = useState(false);

  const [networkData] = useState<NetworkItems>(data);

  const hasFilters = activeFilters.length > 0;

  const { series, domain, metadata, totalHighlightedRequests } = useMemo(() => {
    return getSeriesAndDomain(networkData, onlyHighlighted, query, activeFilters);
  }, [networkData, query, activeFilters, onlyHighlighted]);

  const sidebarItems = useMemo(() => {
    return getSidebarItems(networkData, onlyHighlighted, query, activeFilters);
  }, [networkData, query, activeFilters, onlyHighlighted]);

  const legendItems = useMemo(() => {
    return getLegendItems();
  }, []);

  const {
    flyoutData,
    onBarClick,
    onProjectionClick,
    onSidebarClick,
    isFlyoutVisible,
    onFlyoutClose,
  } = useFlyout(metadata);

  const renderFilter = useCallback(() => {
    return (
      <WaterfallFilter
        query={query}
        setQuery={setQuery}
        activeFilters={activeFilters}
        setActiveFilters={setActiveFilters}
        onlyHighlighted={onlyHighlighted}
        setOnlyHighlighted={setOnlyHighlighted}
      />
    );
  }, [activeFilters, setActiveFilters, onlyHighlighted, setOnlyHighlighted, query, setQuery]);

  const renderFlyout = useCallback(() => {
    return (
      <WaterfallFlyout
        flyoutData={flyoutData}
        onFlyoutClose={onFlyoutClose}
        isFlyoutVisible={isFlyoutVisible}
      />
    );
  }, [flyoutData, isFlyoutVisible, onFlyoutClose]);

  const highestSideBarIndex = Math.max(...series.map((sr) => sr.x));

  const renderSidebarItem: RenderItem<SidebarItem> = useCallback(
    (item) => {
      return (
        <WaterfallSidebarItem
          item={item}
          renderFilterScreenReaderText={hasFilters && !onlyHighlighted}
          onClick={onSidebarClick}
          highestIndex={highestSideBarIndex}
        />
      );
    },
    [hasFilters, onlyHighlighted, onSidebarClick, highestSideBarIndex]
  );

  useTrackMetric({ app: 'uptime', metric: 'waterfall_chart_view', metricType: METRIC_TYPE.COUNT });
  useTrackMetric({
    app: 'uptime',
    metric: 'waterfall_chart_view',
    metricType: METRIC_TYPE.COUNT,
    delay: 15000,
  });

  return (
    <WaterfallProvider
      activeStep={activeStep}
      markerItems={markerItems}
      totalNetworkRequests={total}
      fetchedNetworkRequests={networkData.length}
      highlightedNetworkRequests={totalHighlightedRequests}
      data={series}
      onElementClick={useCallback(onBarClick, [onBarClick])}
      onProjectionClick={useCallback(onProjectionClick, [onProjectionClick])}
      onSidebarClick={onSidebarClick}
      showOnlyHighlightedNetworkRequests={onlyHighlighted}
      sidebarItems={sidebarItems}
      legendItems={legendItems}
      metadata={metadata}
      renderTooltipItem={useCallback((tooltipProps) => {
        return <EuiHealth color={String(tooltipProps?.colour)}>{tooltipProps?.value}</EuiHealth>;
      }, [])}
    >
      <WaterfallChart
        tickFormat={useCallback((d: number) => `${Number(d).toFixed(0)} ms`, [])}
        domain={domain}
        barStyleAccessor={useCallback(({ datum }) => {
          if (!datum.config?.isHighlighted) {
            return {
              rect: {
                fill: datum.config?.colour,
                opacity: '0.1',
              },
            };
          }
          return datum.config.colour;
        }, [])}
        renderSidebarItem={renderSidebarItem}
        renderLegendItem={renderLegendItem}
        renderFlyout={renderFlyout}
        renderFilter={renderFilter}
        fullHeight={true}
      />
    </WaterfallProvider>
  );
};
