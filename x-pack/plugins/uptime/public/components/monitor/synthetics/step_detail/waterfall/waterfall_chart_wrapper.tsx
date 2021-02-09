/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiHealth } from '@elastic/eui';
import { useTrackMetric, METRIC_TYPE } from '../../../../../../../observability/public';
import { getSeriesAndDomain, getSidebarItems, getLegendItems } from './data_formatting';
import {
  SidebarItem,
  LegendItem as LegendItemType,
  NetworkItems,
  Timings,
  MimeTypesMap,
} from './types';
import { WaterfallProvider, WaterfallChart, RenderItem } from '../../waterfall';
import { WaterfallFilter } from './waterfall_filter';
import { LegendItem } from './legend_item';
import { WaterfallSidebarItem } from './waterfall_sidebar_item';

interface Props {
  total: number;
  data: NetworkItems;
}

export const WaterfallChartWrapper: React.FC<Props> = ({ data, total }) => {
  const [query, setQuery] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [onlyHighlighted, setOnlyHighlighted] = useState(false);

  const [networkData] = useState<NetworkItems>(data);

  const hasFilters = activeFilters.length > 0;

  const { series, domain, totalHighlightedRequests } = useMemo(() => {
    return getSeriesAndDomain(networkData, onlyHighlighted, query, activeFilters);
  }, [networkData, query, activeFilters, onlyHighlighted]);

  const [hiddenLegends, setHiddenLegends] = useState<string[]>([]);
  const [hoveredLegend, setHoveredLegend] = useState<string | null>(null);

  const sidebarItems = useMemo(() => {
    return getSidebarItems(networkData, onlyHighlighted, query, activeFilters);
  }, [networkData, query, activeFilters, onlyHighlighted]);

  const legendItems = getLegendItems();

  const renderLegendItem: RenderItem<LegendItemType> = (item) => {
    return (
      <LegendItem
        item={item}
        onHoverToggle={(val: string | null) => setHoveredLegend(val)}
        onToggle={(val) => {
          if (val) {
            setHiddenLegends((prevState) => prevState.filter((legend) => legend !== item.id));
          } else {
            setHiddenLegends((prevState) => [...prevState, item.id]);
          }
        }}
      />
    );
  };

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

  const renderSidebarItem: RenderItem<SidebarItem> = useCallback(
    (item) => {
      return (
        <WaterfallSidebarItem
          item={item}
          renderFilterScreenReaderText={hasFilters && !onlyHighlighted}
        />
      );
    },
    [hasFilters, onlyHighlighted]
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
      totalNetworkRequests={total}
      fetchedNetworkRequests={networkData.length}
      highlightedNetworkRequests={totalHighlightedRequests}
      data={series}
      showOnlyHighlightedNetworkRequests={onlyHighlighted}
      sidebarItems={sidebarItems}
      legendItems={legendItems}
      renderTooltipItem={(tooltipProps) => {
        return <EuiHealth color={String(tooltipProps?.colour)}>{tooltipProps?.value}</EuiHealth>;
      }}
    >
      <WaterfallChart
        tickFormat={(d: number) => `${Number(d).toFixed(0)} ms`}
        domain={domain}
        barStyleAccessor={(datum) => {
          if (hiddenLegends.length > 0 && hiddenLegends.includes(datum.datum.config.timing)) {
            return {
              rect: {
                opacity: 0,
              },
            };
          }
          if (hoveredLegend && hoveredLegend !== datum.datum.config.timing) {
            if (
              hoveredLegend === MimeTypesMap[datum.datum.config.mimeType] &&
              datum.datum.config.timing === Timings.Receive
            ) {
              return datum.datum.config.colour;
            }
          }
          if (!datum.datum.config.isHighlighted) {
            return {
              rect: {
                fill: datum.datum.config.colour,
                opacity: '0.1',
              },
            };
          }
          return datum.datum.config.colour;
        }}
        renderSidebarItem={renderSidebarItem}
        renderLegendItem={renderLegendItem}
        renderFilter={renderFilter}
        fullHeight={true}
      />
    </WaterfallProvider>
  );
};
