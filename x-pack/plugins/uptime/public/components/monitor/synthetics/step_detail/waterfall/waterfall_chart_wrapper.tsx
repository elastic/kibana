/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { EuiHealth, EuiFlexGroup, EuiFlexItem, EuiBadge } from '@elastic/eui';
import { getSeriesAndDomain, getSidebarItems, getLegendItems } from './data_formatting';
import { SidebarItem, LegendItem, NetworkItems } from './types';
import {
  WaterfallProvider,
  WaterfallChart,
  MiddleTruncatedText,
  RenderItem,
} from '../../waterfall';
import { WaterfallFilter } from './waterfall_filter';
import { SideBarItemHighlighter } from '../../waterfall/components/styles';

export const renderSidebarItem: RenderItem<SidebarItem> = (item) => {
  const { status, offsetIndex } = item;

  const isErrorStatusCode = (statusCode: number) => {
    const is400 = statusCode >= 400 && statusCode <= 499;
    const is500 = statusCode >= 500 && statusCode <= 599;
    const isSpecific300 = statusCode === 301 || statusCode === 307 || statusCode === 308;
    return is400 || is500 || isSpecific300;
  };

  return (
    <SideBarItemHighlighter
      isHighlighted={item.isHighlighted}
      data-test-subj={item.isHighlighted ? 'sideBarHighlightedItem' : 'sideBarDimmedItem'}
    >
      {!status || !isErrorStatusCode(status) ? (
        <MiddleTruncatedText text={`${offsetIndex}. ${item.url}`} />
      ) : (
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <MiddleTruncatedText text={`${offsetIndex}. ${item.url}`} />
          </EuiFlexItem>
          <EuiFlexItem component="span" grow={false}>
            <EuiBadge color="danger">{status}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </SideBarItemHighlighter>
  );
};

export const renderLegendItem: RenderItem<LegendItem> = (item) => {
  return <EuiHealth color={item.colour}>{item.name}</EuiHealth>;
};

interface Props {
  total: number;
  data: NetworkItems;
}

export const WaterfallChartWrapper: React.FC<Props> = ({ data, total }) => {
  const [query, setQuery] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [onlyHighlighted, setOnlyHighlighted] = useState(false);

  const [networkData] = useState<NetworkItems>(data);

  const { series, domain, totalHighlightedRequests } = useMemo(() => {
    return getSeriesAndDomain(networkData, onlyHighlighted, query, activeFilters);
  }, [networkData, query, activeFilters, onlyHighlighted]);

  const sidebarItems = useMemo(() => {
    return getSidebarItems(networkData, onlyHighlighted, query, activeFilters);
  }, [networkData, query, activeFilters, onlyHighlighted]);

  const legendItems = getLegendItems();

  const renderFilter = () => {
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
  };

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
