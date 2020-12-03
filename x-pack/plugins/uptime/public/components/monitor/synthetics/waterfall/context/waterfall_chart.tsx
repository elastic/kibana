/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, Context } from 'react';
import { WaterfallData, WaterfallDataEntry } from '../types';

export interface IWaterfallContext {
  data: WaterfallData;
  sidebarItems?: unknown[];
  legendItems?: unknown[];
  renderTooltipItem: (
    item: WaterfallDataEntry['config']['tooltipProps'],
    index?: number
  ) => JSX.Element;
}

export const WaterfallContext = createContext<Partial<IWaterfallContext>>({});

interface ProviderProps {
  data: IWaterfallContext['data'];
  sidebarItems?: IWaterfallContext['sidebarItems'];
  legendItems?: IWaterfallContext['legendItems'];
  renderTooltipItem: IWaterfallContext['renderTooltipItem'];
}

export const WaterfallProvider: React.FC<ProviderProps> = ({
  children,
  data,
  sidebarItems,
  legendItems,
  renderTooltipItem,
}) => {
  return (
    <WaterfallContext.Provider value={{ data, sidebarItems, legendItems, renderTooltipItem }}>
      {children}
    </WaterfallContext.Provider>
  );
};

export const useWaterfallContext = () =>
  useContext((WaterfallContext as unknown) as Context<IWaterfallContext>);
