/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
  isDataFrameAnalyticsFailed,
  isDataFrameAnalyticsRunning,
  DataFrameAnalyticsListAction,
  DataFrameAnalyticsListRow,
} from '../analytics_list/common';
import { stopAnalytics } from '../../services/analytics_service';

import { stopActionNameText, StopActionName } from './stop_action_name';

export type StopAction = ReturnType<typeof useStopAction>;
export const useStopAction = (canStartStopDataFrameAnalytics: boolean) => {
  const [isModalVisible, setModalVisible] = useState(false);

  const [item, setItem] = useState<DataFrameAnalyticsListRow>();

  const closeModal = () => setModalVisible(false);
  const forceStopAndCloseModal = () => {
    if (item !== undefined) {
      setModalVisible(false);
      stopAnalytics(item);
    }
  };

  const openModal = (newItem: DataFrameAnalyticsListRow) => {
    setItem(newItem);
    setModalVisible(true);
  };

  const clickHandler = useCallback(
    (i: DataFrameAnalyticsListRow) => {
      if (canStartStopDataFrameAnalytics) {
        if (isDataFrameAnalyticsFailed(i.stats.state)) {
          openModal(i);
        } else {
          stopAnalytics(i);
        }
      }
    },
    [stopAnalytics]
  );

  const action: DataFrameAnalyticsListAction = useMemo(
    () => ({
      name: () => <StopActionName isDisabled={!canStartStopDataFrameAnalytics} />,
      available: (i: DataFrameAnalyticsListRow) =>
        isDataFrameAnalyticsRunning(i.stats.state) || isDataFrameAnalyticsFailed(i.stats.state),
      enabled: () => canStartStopDataFrameAnalytics,
      description: stopActionNameText,
      icon: 'stop',
      type: 'icon',
      onClick: clickHandler,
      'data-test-subj': 'mlAnalyticsJobStopButton',
    }),
    [clickHandler]
  );

  return { action, closeModal, isModalVisible, item, openModal, forceStopAndCloseModal };
};
