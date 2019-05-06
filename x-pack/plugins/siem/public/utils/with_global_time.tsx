/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate-latest';
import moment from 'moment';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { TimerangeInput } from '../graphql/types';
import { useInterval } from './hooks/use_interval';
import { replaceStateKeyInQueryString, UrlStateContainer } from './url_state';

export interface GlobalTimeState {
  isAutoReloading: boolean;
  refreshInterval: number;
  setAutoReload: (isAutoReloading: boolean) => void;
  setRefreshInterval: (refreshInterval: number) => void;
  setTimeRange: (timeRange: TimerangeInput) => void;
  timeRange: TimerangeInput;
}

export const useGlobalTime = () => {
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

export const GlobalTimeContainer = createContainer(useGlobalTime);

interface WithMetricsTimeProps {
  children: (args: GlobalTimeState) => React.ReactElement;
}
export const WithGlobalTime: React.FunctionComponent<WithMetricsTimeProps> = ({
  children,
}: WithMetricsTimeProps) => {
  const metricsTimeState = useContext(GlobalTimeContainer.Context);
  return children({ ...metricsTimeState });
};

/**
 * Url State
 */

interface GlobalTimeUrlState {
  time?: GlobalTimeState['timeRange'];
  autoReload?: boolean;
  refreshInterval?: number;
}

export const WithGlobalTimeUrlState = () => (
  <WithGlobalTime>
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
  </WithGlobalTime>
);

const mapToUrlState = (value: any): GlobalTimeUrlState | undefined =>
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

export const replaceGlobalTimeInQueryString = (from: number, to: number) =>
  Number.isNaN(from) || Number.isNaN(to)
    ? (value: string) => value
    : replaceStateKeyInQueryString<GlobalTimeUrlState>('metricTime', {
        autoReload: false,
        time: {
          interval: '>=1m',
          from,
          to,
        },
      });
