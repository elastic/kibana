/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';

import {
  isDataFrameAnalyticsRunning,
  DataFrameAnalyticsListAction,
  DataFrameAnalyticsListRow,
} from '../analytics_list/common';
import { stopAnalytics } from '../../services/analytics_service';

import { stopActionButtonText, StopButton } from './stop_button';

export type StopAction = ReturnType<typeof useStopAction>;
export const useStopAction = (canStartStopDataFrameAnalytics: boolean) => {
  const clickHandler = useCallback((item: DataFrameAnalyticsListRow) => stopAnalytics(item), [
    stopAnalytics,
  ]);

  const action: DataFrameAnalyticsListAction = useMemo(
    () => ({
      name: (item: DataFrameAnalyticsListRow) => (
        <StopButton isDisabled={!canStartStopDataFrameAnalytics} />
      ),
      available: (i: DataFrameAnalyticsListRow) => isDataFrameAnalyticsRunning(i.stats.state),
      enabled: () => canStartStopDataFrameAnalytics,
      description: stopActionButtonText,
      icon: 'stop',
      type: 'icon',
      onClick: clickHandler,
      'data-test-subj': 'mlAnalyticsJobStopButton',
    }),
    [clickHandler]
  );

  return { action };
};
