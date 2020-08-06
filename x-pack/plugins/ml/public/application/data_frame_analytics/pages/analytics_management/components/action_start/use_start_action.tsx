/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';

import {
  isCompletedAnalyticsJob,
  isDataFrameAnalyticsRunning,
  DataFrameAnalyticsListAction,
  DataFrameAnalyticsListRow,
} from '../analytics_list/common';
import { startAnalytics } from '../../services/analytics_service';
import { useToastNotificationService } from '../../../../../services/toast_notification_service';

import { startActionButtonText, StartButton } from './start_button';

export type StartAction = ReturnType<typeof useStartAction>;
export const useStartAction = (canStartStopDataFrameAnalytics: boolean) => {
  const [isModalVisible, setModalVisible] = useState(false);

  const [item, setItem] = useState<DataFrameAnalyticsListRow>();

  const toastNotificationService = useToastNotificationService();

  const closeModal = () => setModalVisible(false);
  const startAndCloseModal = () => {
    if (item !== undefined) {
      setModalVisible(false);
      startAnalytics(item, toastNotificationService);
    }
  };

  const openModal = (newItem: DataFrameAnalyticsListRow) => {
    setItem(newItem);
    setModalVisible(true);
  };

  const startButtonEnabled = (i: DataFrameAnalyticsListRow) => {
    if (!isDataFrameAnalyticsRunning(i.stats.state)) {
      // Disable start for analytics jobs which have completed.
      const completeAnalytics = isCompletedAnalyticsJob(i.stats);
      return canStartStopDataFrameAnalytics && !completeAnalytics;
    }
    return canStartStopDataFrameAnalytics;
  };

  const action: DataFrameAnalyticsListAction = useMemo(
    () => ({
      name: (i: DataFrameAnalyticsListRow) => (
        <StartButton
          isDisabled={!startButtonEnabled(i)}
          item={i}
          canStartStopDataFrameAnalytics={canStartStopDataFrameAnalytics}
        />
      ),
      available: (i: DataFrameAnalyticsListRow) => !isDataFrameAnalyticsRunning(i.stats.state),
      enabled: startButtonEnabled,
      description: startActionButtonText,
      icon: 'play',
      type: 'icon',
      onClick: openModal,
      'data-test-subj': 'mlAnalyticsJobStartButton',
    }),
    []
  );

  return {
    action,
    closeModal,
    isModalVisible,
    item,
    openModal,
    startAndCloseModal,
  };
};
