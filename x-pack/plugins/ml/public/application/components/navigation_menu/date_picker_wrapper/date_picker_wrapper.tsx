/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useState, useEffect } from 'react';
import { Subscription } from 'rxjs';
import { EuiSuperDatePicker, OnRefreshProps } from '@elastic/eui';
import { TimeRange, TimeHistoryContract } from 'src/plugins/data/public';

import { mlTimefilterRefresh$ } from '../../../services/timefilter_refresh_service';
import { useUrlState } from '../../../util/url_state';
import { useMlKibana } from '../../../contexts/kibana';

interface Duration {
  start: string;
  end: string;
}

interface RefreshInterval {
  pause: boolean;
  value: number;
}

function getRecentlyUsedRangesFactory(timeHistory: TimeHistoryContract) {
  return function (): Duration[] {
    return (
      timeHistory.get()?.map(({ from, to }: TimeRange) => {
        return {
          start: from,
          end: to,
        };
      }) ?? []
    );
  };
}

function updateLastRefresh(timeRange: OnRefreshProps) {
  mlTimefilterRefresh$.next({ lastRefresh: Date.now(), timeRange });
}

export const DatePickerWrapper: FC = () => {
  const { services } = useMlKibana();
  const config = services.uiSettings;
  const { timefilter, history } = services.data.query.timefilter;

  const [globalState, setGlobalState] = useUrlState('_g');
  const getRecentlyUsedRanges = getRecentlyUsedRangesFactory(history);

  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(
    globalState?.refreshInterval ?? timefilter.getRefreshInterval()
  );
  useEffect(() => {
    setGlobalState({ refreshInterval });
    timefilter.setRefreshInterval(refreshInterval);
  }, [refreshInterval?.pause, refreshInterval?.value]);

  const [time, setTime] = useState(timefilter.getTime());
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState(getRecentlyUsedRanges());
  const [isAutoRefreshSelectorEnabled, setIsAutoRefreshSelectorEnabled] = useState(
    timefilter.isAutoRefreshSelectorEnabled()
  );
  const [isTimeRangeSelectorEnabled, setIsTimeRangeSelectorEnabled] = useState(
    timefilter.isTimeRangeSelectorEnabled()
  );

  const dateFormat = config.get('dateFormat');

  useEffect(() => {
    const subscriptions = new Subscription();
    const refreshIntervalUpdate$ = timefilter.getRefreshIntervalUpdate$();
    if (refreshIntervalUpdate$ !== undefined) {
      subscriptions.add(refreshIntervalUpdate$.subscribe(timefilterUpdateListener));
    }
    const timeUpdate$ = timefilter.getTimeUpdate$();
    if (timeUpdate$ !== undefined) {
      subscriptions.add(timeUpdate$.subscribe(timefilterUpdateListener));
    }
    const enabledUpdated$ = timefilter.getEnabledUpdated$();
    if (enabledUpdated$ !== undefined) {
      subscriptions.add(enabledUpdated$.subscribe(timefilterUpdateListener));
    }

    return function cleanup() {
      subscriptions.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Force re-render with up-to-date values when isTimeRangeSelectorEnabled/isAutoRefreshSelectorEnabled are changed.
    timefilterUpdateListener();
  }, [isTimeRangeSelectorEnabled, isAutoRefreshSelectorEnabled]);

  function timefilterUpdateListener() {
    setTime(timefilter.getTime());
    setRefreshInterval(timefilter.getRefreshInterval());
    setIsAutoRefreshSelectorEnabled(timefilter.isAutoRefreshSelectorEnabled());
    setIsTimeRangeSelectorEnabled(timefilter.isTimeRangeSelectorEnabled());
  }

  function updateFilter({ start, end }: Duration) {
    const newTime = { from: start, to: end };
    // Update timefilter for controllers listening for changes
    timefilter.setTime(newTime);
    setTime(newTime);
    setRecentlyUsedRanges(getRecentlyUsedRanges());
  }

  function updateInterval({
    isPaused: pause,
    refreshInterval: value,
  }: {
    isPaused: boolean;
    refreshInterval: number;
  }) {
    setRefreshInterval({ pause, value });
  }

  return (
    <Fragment>
      {(isAutoRefreshSelectorEnabled || isTimeRangeSelectorEnabled) && (
        <div className="mlNavigationMenu__datePickerWrapper">
          <EuiSuperDatePicker
            start={time.from}
            end={time.to}
            isPaused={refreshInterval.pause}
            isAutoRefreshOnly={!isTimeRangeSelectorEnabled}
            refreshInterval={refreshInterval.value}
            onTimeChange={updateFilter}
            onRefresh={updateLastRefresh}
            onRefreshChange={updateInterval}
            recentlyUsedRanges={recentlyUsedRanges}
            dateFormat={dateFormat}
          />
        </div>
      )}
    </Fragment>
  );
};
