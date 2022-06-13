/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState, useContext, useEffect } from 'react';
import createContainer from 'constate';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { Legacy } from '../../legacy_shims';
import { GlobalStateContext } from '../contexts/global_state_context';

interface TimeOptions {
  from: string;
  to: string;
  interval: string;
}

export const DEFAULT_TIMERANGE: TimeOptions = {
  from: 'now-1h',
  to: 'now',
  interval: '>=10s',
};

export const useMonitoringTime = () => {
  const { services } = useKibana<{ data: any }>();
  const state = useContext(GlobalStateContext);

  const defaultTimeRange = {
    ...DEFAULT_TIMERANGE,
    ...services.data?.query.timefilter.timefilter.getTime(),
  };

  const { value, pause } = services.data?.query.timefilter.timefilter.getRefreshInterval();
  const [refreshInterval, setRefreshInterval] = useState(value);
  const [isPaused, setIsPaused] = useState(pause);
  const [currentTimerange, setTimeRange] = useState<TimeOptions>(defaultTimeRange);
  const [isDisabled, setIsDisabled] = useState(false);

  const handleTimeChange = useCallback(
    (start: string, end: string) => {
      setTimeRange({ ...currentTimerange, from: start, to: end });
      state.time = {
        from: start,
        to: end,
      };
      Legacy.shims.timefilter.setTime(state.time);
      state.save?.();
    },
    [currentTimerange, setTimeRange, state]
  );

  useEffect(() => {
    const sub = Legacy.shims.timefilter.getTimeUpdate$().subscribe(function onTimeUpdate() {
      const updatedTime = Legacy.shims.timefilter.getTime();
      setTimeRange({ ...currentTimerange, ...updatedTime });
      state.time = { ...updatedTime };
      state.save?.();
    });

    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    currentTimerange,
    setTimeRange,
    handleTimeChange,
    setRefreshInterval,
    refreshInterval,
    setIsPaused,
    isPaused,
    setIsDisabled,
    isDisabled,
  };
};

export const MonitoringTimeContainer = createContainer(useMonitoringTime);
