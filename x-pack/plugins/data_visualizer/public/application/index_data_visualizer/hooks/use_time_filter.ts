/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { map } from 'rxjs/operators';
import { useDataVisualizerKibana } from '../../kibana_context';

interface UseTimefilterOptions {
  timeRangeSelector?: boolean;
  autoRefreshSelector?: boolean;
}

export const useTimefilter = ({
  timeRangeSelector,
  autoRefreshSelector,
}: UseTimefilterOptions = {}) => {
  const { services } = useDataVisualizerKibana();
  const { timefilter } = services.data.query.timefilter;

  useEffect(() => {
    if (timeRangeSelector === true) {
      timefilter.enableTimeRangeSelector();
    } else if (timeRangeSelector === false) {
      timefilter.disableTimeRangeSelector();
    }

    if (autoRefreshSelector === true) {
      timefilter.enableAutoRefreshSelector();
    } else if (autoRefreshSelector === false) {
      timefilter.disableAutoRefreshSelector();
    }
  }, [timeRangeSelector, autoRefreshSelector, timefilter]);

  return timefilter;
};

export const useRefreshIntervalUpdates = () => {
  const timefilter = useTimefilter();

  return useObservable(
    timefilter.getRefreshIntervalUpdate$().pipe(map(timefilter.getRefreshInterval)),
    timefilter.getRefreshInterval()
  );
};

export const useTimeRangeUpdates = (absolute = false) => {
  const timefilter = useTimefilter();

  const getTimeCallback = absolute
    ? timefilter.getAbsoluteTime.bind(timefilter)
    : timefilter.getTime.bind(timefilter);

  return useObservable(timefilter.getTimeUpdate$().pipe(map(getTimeCallback)), getTimeCallback());
};
