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

import { WaterfallMetadata, WaterfallMetadataEntry } from '../types';

interface OnSidebarClickParams {
  buttonRef?: ButtonRef;
  networkItemIndex: number;
}

export type ButtonRef = RefObject<HTMLButtonElement | null>;
export type OnSidebarClick = (params: OnSidebarClickParams) => void;
export type OnProjectionClick = ProjectionClickListener;
export type OnElementClick = ElementClickListener;
export type OnFlyoutClose = () => void;

export const useFlyout = (metadata: WaterfallMetadata) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [flyoutData, setFlyoutData] = useState<WaterfallMetadataEntry | undefined>(undefined);
  const [currentSidebarItemRef, setCurrentSidebarItemRef] =
    useState<RefObject<HTMLButtonElement | null>>();

  const handleFlyout = useCallback(
    (flyoutEntry: WaterfallMetadataEntry) => {
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
      const metadataEntry = metadata[datum.config.id];
      handleFlyout(metadataEntry);
    },
    [metadata, handleFlyout]
  );

  const onProjectionClick: ProjectionClickListener = useCallback(
    (projectionData) => {
      setIsFlyoutVisible(false);
      const { x } = projectionData as ProjectedValues;
      if (typeof x === 'number' && x >= 0) {
        const metadataEntry = metadata[x];
        handleFlyout(metadataEntry);
      }
    },
    [metadata, handleFlyout]
  );

  const onSidebarClick: OnSidebarClick = useCallback(
    ({ buttonRef, networkItemIndex }) => {
      if (isFlyoutVisible && buttonRef === currentSidebarItemRef) {
        setIsFlyoutVisible(false);
      } else {
        const metadataEntry = metadata[networkItemIndex];
        setCurrentSidebarItemRef(buttonRef);
        handleFlyout(metadataEntry);
      }
    },
    [currentSidebarItemRef, handleFlyout, isFlyoutVisible, metadata, setIsFlyoutVisible]
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
