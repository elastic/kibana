/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';
import createContainer from 'constate';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

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

const DEFAULT_REFRESH_INTERVAL_VALUE = 10000;
const DEFAULT_REFRESH_INTERVAL_PAUSE = false;

export const useMonitoringTime = () => {
  const { services } = useKibana<{ data: any }>();
  const defaultTimeRange = {
    ...DEFAULT_TIMERANGE,
    ...services.data?.query.timefilter.timefilter.getTime(),
  };

  const { value, pause } = services.data?.query.timefilter.timefilter.getRefreshInterval();
  const [refreshInterval, setRefreshInterval] = useState(value || DEFAULT_REFRESH_INTERVAL_VALUE);
  const [isPaused, setIsPaused] = useState(pause || DEFAULT_REFRESH_INTERVAL_PAUSE);
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
