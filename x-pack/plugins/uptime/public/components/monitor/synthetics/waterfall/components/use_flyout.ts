/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useState } from 'react';

import {
  ElementClickListener,
  ProjectionClickListener,
  ProjectedValues,
  XYChartElementEvent,
} from '@elastic/charts';

import { WaterfallMetaData, WaterfallMetaDataEntry } from '../types';

export const useFlyout = (metaData: WaterfallMetaData) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [flyoutData, setFlyoutData] = useState<WaterfallMetaDataEntry>({
    x: 0,
    url: '',
    details: [],
  });

  const handleFlyout = useCallback(
    (flyoutEntry: WaterfallMetaDataEntry) => {
      setFlyoutData(flyoutEntry);
      setIsFlyoutVisible(true);
    },
    [setIsFlyoutVisible, setFlyoutData]
  );

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

  const onSidebarClick = useCallback(
    ({ networkItemIndex }: { networkItemIndex: number }) => {
      const metaDataEntry = metaData[networkItemIndex];
      handleFlyout(metaDataEntry);
    },
    [metaData, handleFlyout]
  );

  return {
    flyoutData,
    onBarClick,
    onProjectionClick,
    onSidebarClick,
    isFlyoutVisible,
    setIsFlyoutVisible,
  };
};
