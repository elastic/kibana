/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, Context, Dispatch, SetStateAction } from 'react';
import { ElementClickListener, ProjectionClickListener } from '@elastic/charts';
import {
  WaterfallData,
  WaterfallDataEntry,
  WaterfallMetaData,
  WaterfallMetaDataEntry,
} from '../types';

export interface IWaterfallContext {
  data: WaterfallData;
  flyoutData?: WaterfallMetaDataEntry;
  onBarClick?: ElementClickListener;
  onProjectionClick?: ProjectionClickListener;
  onSidebarClick?: ({ networkItemIndex }: { networkItemIndex: number }) => void;
  isFlyoutVisible?: boolean;
  setIsFlyoutVisible: Dispatch<SetStateAction<boolean>>;
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
  data: IWaterfallContext['data'];
  flyoutData: IWaterfallContext['flyoutData'];
  onBarClick: IWaterfallContext['onBarClick'];
  onProjectionClick: IWaterfallContext['onProjectionClick'];
  onSidebarClick: IWaterfallContext['onSidebarClick'];
  isFlyoutVisible: IWaterfallContext['isFlyoutVisible'];
  setIsFlyoutVisible: IWaterfallContext['setIsFlyoutVisible'];
  sidebarItems?: IWaterfallContext['sidebarItems'];
  legendItems?: IWaterfallContext['legendItems'];
  metaData: IWaterfallContext['metaData'];
  renderTooltipItem: IWaterfallContext['renderTooltipItem'];
}

export const WaterfallProvider: React.FC<ProviderProps> = ({
  children,
  data,
  flyoutData,
  onBarClick,
  onProjectionClick,
  onSidebarClick,
  isFlyoutVisible,
  setIsFlyoutVisible,
  sidebarItems,
  legendItems,
  metaData,
  renderTooltipItem,
}) => {
  return (
    <WaterfallContext.Provider
      value={{
        data,
        sidebarItems,
        legendItems,
        metaData,
        isFlyoutVisible,
        onBarClick,
        onProjectionClick,
        onSidebarClick,
        setIsFlyoutVisible,
        flyoutData,
        renderTooltipItem,
      }}
    >
      {children}
    </WaterfallContext.Provider>
  );
};

export const useWaterfallContext = () =>
  useContext((WaterfallContext as unknown) as Context<IWaterfallContext>);
