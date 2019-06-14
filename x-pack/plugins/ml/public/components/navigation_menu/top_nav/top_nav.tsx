/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC, useState } from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
// import { i18n } from '@kbn/i18n';

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

  function updateFilter({ start, end }: { start: string; end: string }) {
    // Update timefilter for controllers listening for changes
    timefilter.setTime({ from: start, to: end });
    // Update state
    setTime({ from: start, to: end });
    setRecentlyUsedRanges(getRecentlyUsedRanges(timeHistory));
  }

  function updateInterval({
    isPaused,
    refreshInterval: interval,
  }: {
    isPaused: boolean;
    refreshInterval: number;
  }) {
    // Update timefilter for controllers listening for changes
    timefilter.setRefreshInterval({
      pause: isPaused,
      value: interval,
    });
    // Update state
    setRefreshInterval({
      pause: isPaused,
      value: interval,
    });
  }

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
      // showUpdateButton={true}
    />
  );
};
