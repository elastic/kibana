/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import moment from 'moment';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { InfraTimerangeInput } from '../../graphql/types';
import { useInterval } from '../../hooks/use_interval';
import { replaceStateKeyInQueryString, UrlStateContainer } from '../../utils/url_state';

interface MetricsTimeState {
  timeRange: InfraTimerangeInput;
  setTimeRange: (timeRange: InfraTimerangeInput) => void;
  refreshInterval: number;
  setRefreshInterval: (refreshInterval: number) => void;
  isAutoReloading: boolean;
  setAutoReload: (isAutoReloading: boolean) => void;
}

export const useMetricsTime = () => {
  const [isAutoReloading, setAutoReload] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [timeRange, setTimeRange] = useState({
    from: moment()
      .subtract(1, 'hour')
      .valueOf(),
    to: moment().valueOf(),
    interval: '>=1m',
  });

  const setTimeRangeToNow = useCallback(
    () => {
      const range = timeRange.to - timeRange.from;
      const nowInMs = moment().valueOf();
      setTimeRange({
        from: nowInMs - range,
        to: nowInMs,
        interval: '>=1m',
      });
    },
    [timeRange.from, timeRange.to]
  );

  useInterval(setTimeRangeToNow, isAutoReloading ? refreshInterval : null);

  useEffect(
    () => {
      if (isAutoReloading) {
        setTimeRangeToNow();
      }
    },
    [isAutoReloading]
  );

  return {
    timeRange,
    setTimeRange,
    refreshInterval,
    setRefreshInterval,
    isAutoReloading,
    setAutoReload,
  };
};

export const MetricsTimeContainer = createContainer(useMetricsTime);

interface WithMetricsTimeProps {
  children: (args: MetricsTimeState) => React.ReactElement;
}
export const WithMetricsTime: React.FunctionComponent<WithMetricsTimeProps> = ({
  children,
}: WithMetricsTimeProps) => {
  const metricsTimeState = useContext(MetricsTimeContainer.Context);
  return children({ ...metricsTimeState });
};

/**
 * Url State
 */

interface MetricsTimeUrlState {
  time?: MetricsTimeState['timeRange'];
  autoReload?: boolean;
  refreshInterval?: number;
}

export const WithMetricsTimeUrlState = () => (
  <WithMetricsTime>
    {({
      timeRange,
      setTimeRange,
      refreshInterval,
      setRefreshInterval,
      isAutoReloading,
      setAutoReload,
    }) => (
      <UrlStateContainer
        urlState={{
          time: timeRange,
          autoReload: isAutoReloading,
          refreshInterval,
        }}
        urlStateKey="metricTime"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
          if (newUrlState && newUrlState.time) {
            setTimeRange(newUrlState.time);
          }
          if (newUrlState && newUrlState.autoReload) {
            setAutoReload(true);
          } else if (
            newUrlState &&
            typeof newUrlState.autoReload !== 'undefined' &&
            !newUrlState.autoReload
          ) {
            setAutoReload(false);
          }
          if (newUrlState && newUrlState.refreshInterval) {
            setRefreshInterval(newUrlState.refreshInterval);
          }
        }}
        onInitialize={initialUrlState => {
          if (initialUrlState && initialUrlState.time) {
            setTimeRange(initialUrlState.time);
          }
          if (initialUrlState && initialUrlState.autoReload) {
            setAutoReload(true);
          }
          if (initialUrlState && initialUrlState.refreshInterval) {
            setRefreshInterval(initialUrlState.refreshInterval);
          }
        }}
      />
    )}
  </WithMetricsTime>
);

const mapToUrlState = (value: any): MetricsTimeUrlState | undefined =>
  value
    ? {
        time: mapToTimeUrlState(value.time),
        autoReload: mapToAutoReloadUrlState(value.autoReload),
        refreshInterval: mapToRefreshInterval(value.refreshInterval),
      }
    : undefined;

const mapToTimeUrlState = (value: any) =>
  value && (typeof value.to === 'number' && typeof value.from === 'number') ? value : undefined;

const mapToAutoReloadUrlState = (value: any) => (typeof value === 'boolean' ? value : undefined);

const mapToRefreshInterval = (value: any) => (typeof value === 'number' ? value : undefined);

export const replaceMetricTimeInQueryString = (from: number, to: number) =>
  Number.isNaN(from) || Number.isNaN(to)
    ? (value: string) => value
    : replaceStateKeyInQueryString<MetricsTimeUrlState>('metricTime', {
        autoReload: false,
        time: {
          interval: '>=1m',
          from,
          to,
        },
      });
