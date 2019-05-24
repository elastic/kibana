/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React from 'react';
import { useUrlParams } from '../../hooks';

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
  history: any;
  location: any;
  refreshApp: () => void;
}

type UptimeDatePickerProps = Props;

export const UptimeDatePicker = (props: UptimeDatePickerProps) => {
  const { history, location, refreshApp } = props;
  const [
    { autorefreshInterval, autorefreshIsPaused, dateRangeStart, dateRangeEnd },
    updateUrl,
  ] = useUrlParams(history, location);
  return (
    <EuiSuperDatePicker
      start={dateRangeStart}
      end={dateRangeEnd}
      isPaused={autorefreshIsPaused}
      refreshInterval={autorefreshInterval}
      onTimeChange={({ start, end }: SuperDateRangePickerRangeChangedEvent) => {
        updateUrl({ dateRangeStart: start, dateRangeEnd: end });
        refreshApp();
      }}
      // @ts-ignore onRefresh is not defined on EuiSuperDatePicker's type yet
      onRefresh={refreshApp}
      onRefreshChange={({ isPaused, refreshInterval }: SuperDateRangePickerRefreshChangedEvent) => {
        updateUrl({
          autorefreshInterval:
            refreshInterval === undefined ? autorefreshInterval : refreshInterval,
          autorefreshPaused: isPaused,
        });
      }}
    />
  );
};
