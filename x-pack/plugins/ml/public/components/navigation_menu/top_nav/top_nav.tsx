/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC, useState, useEffect } from 'react';
// import { Subscription } from 'rxjs';
import { EuiSuperDatePicker } from '@elastic/eui';
// import { i18n } from '@kbn/i18n';
import { Timefilter } from 'src/legacy/ui/public/timefilter';
import { timefilter$, TIMEFILTER, Action } from '../../../../common/timefilter';

interface Props {
  timefilter: any;
  timeHistory: any;
}

function getRecentlyUsedRanges(timeHistory: any): Array<{ start: string; end: string }> {
  return timeHistory.get().map(({ from, to }: { from: number; to: number }) => {
    return {
      start: from,
      end: to,
    };
  });
}
// TODO: fix types
export const TopNav: SFC<Props> = ({ timefilter, timeHistory }) => {
  const [refreshInterval, setRefreshInterval] = useState(timefilter.getRefreshInterval());
  const [time, setTime] = useState(timefilter.getTime());
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState(getRecentlyUsedRanges(timeHistory));
  // isAutoRefreshSelectorEnabled: timefilter.isAutoRefreshSelectorEnabled,
  // isTimeRangeSelectorEnabled: timefilter.isTimeRangeSelectorEnabled,

  useEffect(() => {
    const subscription = timefilter$.subscribe(timefilterUpdateListener);

    return function cleanup() {
      subscription.unsubscribe();
    };
  }, []);

  function timefilterUpdateListener({
    action,
    payload,
  }: {
    action: Action;
    payload: Timefilter['time'];
  }) {
    switch (action) {
      case TIMEFILTER.SET_REFRESH_INTERVAL:
      case TIMEFILTER.SET_TIME:
        setTime(payload);
      default:
        return;
    }
  }

  function updateFilter({ start, end }: { start: string; end: string }) {
    const newTime = { from: start, to: end };
    // Update timefilter for controllers listening for changes
    timefilter.setTime(newTime);
    // TODO: topNav will eventually depend on the timefilter wrapper so this will be removed
    timefilter$.next({ action: TIMEFILTER.SET_TIME, payload: newTime });
    // Update state
    setTime(newTime);
    setRecentlyUsedRanges(getRecentlyUsedRanges(timeHistory));
  }

  function updateInterval({
    isPaused,
    refreshInterval: interval,
  }: {
    isPaused: boolean;
    refreshInterval: number;
  }) {
    const newInterval = {
      pause: isPaused,
      value: interval,
    };
    // Update timefilter for controllers listening for changes
    timefilter.setRefreshInterval(newInterval);
    // TODO: topNav will eventually depend on the timefilter wrapper so this will be removed
    timefilter$.next({
      action: TIMEFILTER.SET_REFRESH_INTERVAL,
      payload: newInterval,
    });
    // Update state
    setRefreshInterval(newInterval);
  }
  // TODO: ng-if="timefilterValues.isAutoRefreshSelectorEnabled || timefilterValues.isTimeRangeSelectorEnabled"
  // duplicate this behavior of conditional display from kbn_global_timepicker.html
  return (
    <EuiSuperDatePicker
      start={time.from}
      end={time.to}
      isPaused={refreshInterval.pause}
      isAutoRefreshOnly={!timefilter.isAutoRefreshSelectorEnabled}
      refreshInterval={refreshInterval.value}
      onTimeChange={updateFilter}
      onRefresh={updateFilter}
      onRefreshChange={updateInterval}
      recentlyUsedRanges={recentlyUsedRanges}
      // date-format="dateFormat"
      // showUpdateButton={true}
    />
  );
};
