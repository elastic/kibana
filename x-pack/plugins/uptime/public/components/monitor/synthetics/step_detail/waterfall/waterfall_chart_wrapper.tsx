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

  const onHoverToggle = useCallback((val: string | null) => setHoveredLegend(val), []);

  const onVisibleToggle = useCallback((val, label) => {
    if (val) {
      setHiddenLegends((prevState) => prevState.filter((legend) => legend !== label));
    } else {
      setHiddenLegends((prevState) => [...prevState, label]);
    }
  }, []);

  const renderLegendItem: RenderItem<LegendItemType> = (item) => {
    return <LegendItem item={item} onHoverToggle={onHoverToggle} onToggle={onVisibleToggle} />;
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
          const barConfig = datum.datum.config;

          const lowOpacityStyle = {
            rect: {
              fill: barConfig.colour,
              opacity: '0.1',
            },
          };

          if (!barConfig.isHighlighted) {
            return lowOpacityStyle;
          }

          if (hiddenLegends.length > 0 && hiddenLegends.includes(barConfig.timing)) {
            return {
              rect: {
                opacity: 0,
              },
            };
          }
          if (hoveredLegend) {
            if (hoveredLegend !== barConfig.timing) {
              if (
                hoveredLegend === MimeTypesMap[barConfig.mimeType] &&
                barConfig.timing === Timings.Receive
              ) {
                return barConfig.colour;
              }
              return lowOpacityStyle;
            }
          }

          return barConfig.colour;
        }}
        renderSidebarItem={renderSidebarItem}
        renderLegendItem={renderLegendItem}
        renderFilter={renderFilter}
        fullHeight={true}
      />
    </WaterfallProvider>
  );
};
