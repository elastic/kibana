/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, Context } from 'react';
import { WaterfallData, WaterfallDataEntry, WaterfallMetaData } from '../types';
import { OnSidebarClick } from '../components/use_flyout';

export interface IWaterfallContext {
  totalNetworkRequests: number;
  fetchedNetworkRequests: number;
  data: WaterfallData;
  onSidebarClick?: OnSidebarClick;
  sidebarItems?: unknown[];
  legendItems?: unknown[];
  metaData: WaterfallMetaData;
  renderTooltipItem: (
    item: WaterfallDataEntry['config']['tooltipProps'],
    index?: number
  ) => JSX.Element;
}

export const WaterfallContext = createContext<Partial<IWaterfallContext>>({});

interface ProviderProps {
  totalNetworkRequests: number;
  fetchedNetworkRequests: number;
  data: IWaterfallContext['data'];
  onSidebarClick?: IWaterfallContext['onSidebarClick'];
  sidebarItems?: IWaterfallContext['sidebarItems'];
  legendItems?: IWaterfallContext['legendItems'];
  metaData: IWaterfallContext['metaData'];
  renderTooltipItem: IWaterfallContext['renderTooltipItem'];
}

export const WaterfallProvider: React.FC<ProviderProps> = ({
  children,
  data,
  onSidebarClick,
  sidebarItems,
  legendItems,
  metaData,
  renderTooltipItem,
  totalNetworkRequests,
  fetchedNetworkRequests,
}) => {
  return (
    <WaterfallContext.Provider
      value={{
        data,
        sidebarItems,
        legendItems,
        metaData,
        onSidebarClick,
        renderTooltipItem,
        totalNetworkRequests,
        fetchedNetworkRequests,
      }}
    >
      {children}
    </WaterfallContext.Provider>
  );
};

export const useWaterfallContext = () =>
  useContext((WaterfallContext as unknown) as Context<IWaterfallContext>);
