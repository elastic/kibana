/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router';
import { useUrlParams } from '../../hooks/useUrlParams';
import { UptimePersistedState } from '../../uptime_app';

// TODO: when EUI exports types for this, this should be replaced
interface SuperDateRangePickerRangeChangedEvent {
  start: string;
  end: string;
}

interface SuperDateRangePickerRefreshChangedEvent {
  isPaused: boolean;
  refreshInterval?: number;
}

interface Props {
  defaultDateRangeStart: string;
  defaultDateRangeEnd: string;
  defaultAutorefreshIsPaused: boolean;
  defaultAutorefreshInterval: number;
  history: any;
  location: any;
  refreshApp: () => void;
  setAutorefreshInterval: (value: number) => void;
  setAutorefreshIsPaused: (value: boolean) => void;
  setDateRangeStart: (value: string) => void;
  setDateRangeEnd: (value: string) => void;
  persistState: (state: UptimePersistedState) => void;
}

type UptimeDatePickerProps = Props;

export const UptimeDatePicker = (props: UptimeDatePickerProps) => {
  const {
    defaultDateRangeStart: dateRangeStart,
    defaultDateRangeEnd: dateRangeEnd,
    defaultAutorefreshIsPaused: autorefreshIsPaused,
    defaultAutorefreshInterval: autorefreshInterval,
    history,
    location,
    refreshApp,
    setAutorefreshInterval,
    setAutorefreshIsPaused,
    setDateRangeStart,
    setDateRangeEnd,
    persistState,
  } = props;
  console.log(props);
  console.log(history);
  console.log(location);
  const [currentUrlParams, updateUrl] = useUrlParams(history, location);
  console.log(currentUrlParams);
  console.log(updateUrl);
  return (
    <EuiSuperDatePicker
      start={dateRangeStart}
      end={dateRangeEnd}
      isPaused={autorefreshIsPaused}
      refreshInterval={autorefreshInterval}
      onTimeChange={({ start, end }: SuperDateRangePickerRangeChangedEvent) => {
        setDateRangeStart(start);
        setDateRangeEnd(end);
        persistState({
          autorefreshInterval,
          autorefreshIsPaused,
          dateRangeStart,
          dateRangeEnd,
        });
        refreshApp();
      }}
      // @ts-ignore onRefresh is not defined on EuiSuperDatePicker's type yet
      onRefresh={refreshApp}
      onRefreshChange={({ isPaused, refreshInterval }: SuperDateRangePickerRefreshChangedEvent) => {
        setAutorefreshInterval(
          refreshInterval === undefined ? autorefreshInterval : refreshInterval
        );
        setAutorefreshIsPaused(isPaused);
        persistState({
          autorefreshInterval,
          autorefreshIsPaused,
          dateRangeStart,
          dateRangeEnd,
        });
      }}
    />
  );
};
