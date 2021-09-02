/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';
import createContainer from 'constate';

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
  const defaultTimeRange = {
    from: 'now-1h',
    to: 'now',
    interval: DEFAULT_TIMERANGE.interval,
  };
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTimerange, setTimeRange] = useState<TimeOptions>(defaultTimeRange);

  const handleTimeChange = useCallback(
    (start: string, end: string) => {
      setTimeRange({ ...currentTimerange, from: start, to: end });
    },
    [currentTimerange, setTimeRange]
  );

  return {
    currentTimerange,
    setTimeRange,
    handleTimeChange,
    setRefreshInterval,
    refreshInterval,
    setIsPaused,
    isPaused,
  };
};

export const MonitoringTimeContainer = createContainer(useMonitoringTime);
