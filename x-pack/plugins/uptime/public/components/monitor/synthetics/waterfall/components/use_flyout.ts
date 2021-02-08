/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefObject, useCallback, useState } from 'react';

import {
  ElementClickListener,
  ProjectionClickListener,
  ProjectedValues,
  XYChartElementEvent,
} from '@elastic/charts';

import { WaterfallMetaData, WaterfallMetaDataEntry } from '../types';

interface OnSidebarClickParams {
  buttonRef: ButtonRef;
  networkItemIndex: number;
}

export type ButtonRef = RefObject<HTMLButtonElement | null>;
export type OnSidebarClick = (params: OnSidebarClickParams) => void;
export type OnFlyoutClose = () => void;

export const useFlyout = (metaData: WaterfallMetaData) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [flyoutData, setFlyoutData] = useState<WaterfallMetaDataEntry | undefined>(undefined);
  const [currentSidebarItemRef, setCurrentSidebarItemRef] = useState<
    RefObject<HTMLButtonElement | null>
  >();

  const handleFlyout = useCallback(
    (flyoutEntry: WaterfallMetaDataEntry) => {
      setFlyoutData(flyoutEntry);
      setIsFlyoutVisible(true);
    },
    [setIsFlyoutVisible, setFlyoutData]
  );

  const onFlyoutClose = useCallback(() => {
    setIsFlyoutVisible(false);
    currentSidebarItemRef?.current?.focus();
  }, [currentSidebarItemRef, setIsFlyoutVisible]);

  const onBarClick: ElementClickListener = useCallback(
    ([elementData]) => {
      setIsFlyoutVisible(false);
      const { datum } = (elementData as XYChartElementEvent)[0];
      const metaDataEntry = metaData[datum.config.id];
      handleFlyout(metaDataEntry);
    },
    [metaData, handleFlyout]
  );

  const onProjectionClick: ProjectionClickListener = useCallback(
    (projectionData) => {
      setIsFlyoutVisible(false);
      const { x } = projectionData as ProjectedValues;
      if (typeof x === 'number' && x >= 0) {
        const metaDataEntry = metaData[x];
        handleFlyout(metaDataEntry);
      }
    },
    [metaData, handleFlyout]
  );

  const onSidebarClick: OnSidebarClick = useCallback(
    ({ buttonRef, networkItemIndex }) => {
      if (isFlyoutVisible && buttonRef === currentSidebarItemRef) {
        setIsFlyoutVisible(false);
      } else {
        const metaDataEntry = metaData[networkItemIndex];
        setCurrentSidebarItemRef(buttonRef);
        handleFlyout(metaDataEntry);
      }
    },
    [currentSidebarItemRef, handleFlyout, isFlyoutVisible, metaData, setIsFlyoutVisible]
  );

  return {
    flyoutData,
    onBarClick,
    onProjectionClick,
    onSidebarClick,
    isFlyoutVisible,
    onFlyoutClose,
  };
};
