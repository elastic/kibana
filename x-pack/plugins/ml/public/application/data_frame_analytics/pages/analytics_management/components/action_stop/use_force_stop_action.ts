/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

import { DataFrameAnalyticsListRow } from '../analytics_list/common';
import { stopAnalytics } from '../../services/analytics_service';

export type ForceStopAction = ReturnType<typeof useForceStopAction>;
export const useForceStopAction = () => {
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

  return {
    closeModal,
    isModalVisible,
    item,
    openModal,
    forceStopAndCloseModal,
  };
};
