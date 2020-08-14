/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

import { DataFrameAnalyticsListRow } from '../analytics_list/common';
import { startAnalytics } from '../../services/analytics_service';
import { useToastNotificationService } from '../../../../../services/toast_notification_service';

export type StartAction = ReturnType<typeof useStartAction>;
export const useStartAction = () => {
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

  return {
    closeModal,
    isModalVisible,
    item,
    openModal,
    startAndCloseModal,
  };
};
