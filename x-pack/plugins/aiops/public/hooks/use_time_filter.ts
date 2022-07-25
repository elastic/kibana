/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useAiOpsKibana } from '../kibana_context';

interface UseTimefilterOptions {
  timeRangeSelector?: boolean;
  autoRefreshSelector?: boolean;
}

export const useTimefilter = ({
  timeRangeSelector,
  autoRefreshSelector,
}: UseTimefilterOptions = {}) => {
  const { services } = useAiOpsKibana();
  const { timefilter } = services.data.query.timefilter;

  useEffect(() => {
    if (timeRangeSelector === true && !timefilter.isTimeRangeSelectorEnabled()) {
      timefilter.enableTimeRangeSelector();
    } else if (timeRangeSelector === false && timefilter.isTimeRangeSelectorEnabled()) {
      timefilter.disableTimeRangeSelector();
    }

    if (autoRefreshSelector === true && !timefilter.isAutoRefreshSelectorEnabled()) {
      timefilter.enableAutoRefreshSelector();
    } else if (autoRefreshSelector === false && timefilter.isAutoRefreshSelectorEnabled()) {
      timefilter.disableAutoRefreshSelector();
    }
  }, [timeRangeSelector, autoRefreshSelector, timefilter]);

  return timefilter;
};
