/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, Context } from 'react';
import { WaterfallData, WaterfallDataEntry, WaterfallMetadata } from '../types';
import { OnSidebarClick, OnElementClick, OnProjectionClick } from '../components/use_flyout';

export interface IWaterfallContext {
  totalNetworkRequests: number;
  highlightedNetworkRequests: number;
  fetchedNetworkRequests: number;
  data: WaterfallData;
  onElementClick?: OnElementClick;
  onProjectionClick?: OnProjectionClick;
  onSidebarClick?: OnSidebarClick;
  showOnlyHighlightedNetworkRequests: boolean;
  sidebarItems?: any;
  legendItems?: unknown[];
  metadata: WaterfallMetadata;
  renderTooltipItem: (
    item: WaterfallDataEntry['config']['tooltipProps'],
    index?: number
  ) => JSX.Element;
  markersItems: any;
}

export const WaterfallContext = createContext<Partial<IWaterfallContext>>({});

interface ProviderProps {
  totalNetworkRequests: number;
  highlightedNetworkRequests: number;
  fetchedNetworkRequests: number;
  data: IWaterfallContext['data'];
  onElementClick?: IWaterfallContext['onElementClick'];
  onProjectionClick?: IWaterfallContext['onProjectionClick'];
  onSidebarClick?: IWaterfallContext['onSidebarClick'];
  showOnlyHighlightedNetworkRequests: IWaterfallContext['showOnlyHighlightedNetworkRequests'];
  sidebarItems?: IWaterfallContext['sidebarItems'];
  legendItems?: IWaterfallContext['legendItems'];
  metadata: IWaterfallContext['metadata'];
  renderTooltipItem: IWaterfallContext['renderTooltipItem'];
  markersItems: IWaterfallContext['renderTooltipItem'];
}

export const WaterfallProvider: React.FC<ProviderProps> = ({
  children,
  data,
  onElementClick,
  onProjectionClick,
  onSidebarClick,
  showOnlyHighlightedNetworkRequests,
  sidebarItems,
  legendItems,
  metadata,
  renderTooltipItem,
  totalNetworkRequests,
  highlightedNetworkRequests,
  fetchedNetworkRequests,
  markersItems,
}) => {
  return (
    <WaterfallContext.Provider
      value={{
        data,
        showOnlyHighlightedNetworkRequests,
        sidebarItems,
        legendItems,
        metadata,
        onElementClick,
        onProjectionClick,
        onSidebarClick,
        renderTooltipItem,
        totalNetworkRequests,
        highlightedNetworkRequests,
        fetchedNetworkRequests,
        markersItems,
      }}
    >
      {children}
    </WaterfallContext.Provider>
  );
};

export const useWaterfallContext = () =>
  useContext((WaterfallContext as unknown) as Context<IWaterfallContext>);
