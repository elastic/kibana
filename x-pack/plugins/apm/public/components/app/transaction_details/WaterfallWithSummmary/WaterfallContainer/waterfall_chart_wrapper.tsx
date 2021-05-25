/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiHealth } from '@elastic/eui';

import {
  WaterfallChart,
  WaterfallFilter,
  WaterfallProvider,
  WaterfallSidebarItem,
} from '../../../../../../../observability/public';
import {
  getLegendItems,
  getMarkers,
  getSeriesAndDomain,
  getSidebarItems,
} from './data_formatting';
import { IWaterfall } from './Waterfall/waterfall_helpers/waterfall_helpers';

export function renderLegendItem(item) {
  return (
    <EuiHealth color={item.colour} className="eui-textNoWrap">
      {item.name}
    </EuiHealth>
  );
}

interface Props {
  total: number;
  waterfall: IWaterfall;
}

export const WaterfallChartWrapper: React.FC<Props> = ({
  waterfall: networkData,
  total,
}) => {
  const [query, setQuery] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [onlyHighlighted, setOnlyHighlighted] = useState(false);

  const { series } = useMemo(() => {
    return getSeriesAndDomain(
      networkData,
      query,
      onlyHighlighted,
      activeFilters
    );
  }, [activeFilters, networkData, onlyHighlighted, query]);

  const sidebarItems = useMemo(() => {
    return getSidebarItems(networkData, query, onlyHighlighted, activeFilters);
  }, [networkData, query, onlyHighlighted, activeFilters]);

  const renderSidebarItem = useCallback((item) => {
    return (
      <WaterfallSidebarItem
        item={item}
        renderFilterScreenReaderText={false}
        onClick={() => {}}
      />
    );
  }, []);

  const legendItems = useMemo(() => {
    return getLegendItems(networkData);
  }, [networkData]);

  const markers = getMarkers(networkData);

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
  }, [
    activeFilters,
    setActiveFilters,
    onlyHighlighted,
    setOnlyHighlighted,
    query,
    setQuery,
  ]);

  return (
    <WaterfallProvider
      totalNetworkRequests={total}
      fetchedNetworkRequests={networkData.items.length}
      highlightedNetworkRequests={0}
      data={series}
      sidebarItems={sidebarItems}
      metadata={{}}
      showOnlyHighlightedNetworkRequests={false}
      renderTooltipItem={useCallback(({ config, duration }) => {
        return (
          <>
            <EuiHealth color={String(config.tooltipProps?.colour)}>
              {config.tooltipProps?.valueLabel} - duration-{duration} ms
            </EuiHealth>
          </>
        );
      }, [])}
      legendItems={legendItems}
      markersItems={markers}
    >
      <WaterfallChart
        tickFormat={useCallback(
          (d: number) => `${Number(d).toFixed(0)} ms`,
          []
        )}
        domain={{ min: 0, max: networkData.duration / 1000 + 100 }}
        barStyleAccessor={useCallback((datum) => {
          if (!datum.datum.config.isHighlighted) {
            return {
              rect: {
                fill: datum.datum.config.colour,
                opacity: 0.1,
              },
            };
          }
          return {
            rect: {
              fill: datum.datum.config.colour,
              opacity: 1,
            },
          };
        }, [])}
        renderLegendItem={renderLegendItem}
        fullHeight={true}
        renderSidebarItem={renderSidebarItem}
        renderFilter={renderFilter}
      />
    </WaterfallProvider>
  );
};
