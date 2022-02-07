/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { Subscription } from 'rxjs';
import { debounce } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  OnRefreshProps,
} from '@elastic/eui';
import { TimeHistoryContract, TimeRange } from 'src/plugins/data/public';
import { UI_SETTINGS } from '../../../../../../../../src/plugins/data/common';

import { mlTimefilterRefresh$ } from '../../../services/timefilter_refresh_service';
import { useUrlState } from '../../../util/url_state';
import { useMlKibana } from '../../../contexts/kibana';
import { useRefreshIntervalUpdates } from '../../../contexts/kibana/use_timefilter';
import { useToastNotificationService } from '../../../services/toast_notification_service';

interface TimePickerQuickRange {
  from: string;
  to: string;
  display: string;
}

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

function updateLastRefresh(timeRange?: OnRefreshProps) {
  mlTimefilterRefresh$.next({ lastRefresh: Date.now(), ...(timeRange ? { timeRange } : {}) });
}

const DEFAULT_REFRESH_INTERVAL_MS = 1000;

export const DatePickerWrapper: FC = () => {
  const { services } = useMlKibana();
  const config = services.uiSettings;

  const { httpService } = services.mlServices;

  const { timefilter, history } = services.data.query.timefilter;

  const { displayWarningToast } = useToastNotificationService();

  const [globalState, setGlobalState] = useUrlState('_g');
  const getRecentlyUsedRanges = getRecentlyUsedRangesFactory(history);

  const timeFilterRefreshInterval = useRefreshIntervalUpdates();

  const refreshInterval = useMemo((): RefreshInterval => {
    const resultInterval = globalState?.refreshInterval ?? timeFilterRefreshInterval;

    let value = resultInterval.value;
    if (resultInterval.value < DEFAULT_REFRESH_INTERVAL_MS) {
      displayWarningToast(
        i18n.translate('xpack.ml.datePicker.shortRefreshIntervalWarningMessage', {
          defaultMessage: 'Configured refresh interval is too short.',
        })
      );
      value = DEFAULT_REFRESH_INTERVAL_MS;
    }

    /**
     * Enforce pause when it's set to false with 0 refresh interval.
     */
    const pause = resultInterval.pause || (!resultInterval.pause && resultInterval.value <= 0);

    return { value, pause };
  }, [JSON.stringify(globalState?.refreshInterval), timeFilterRefreshInterval]);

  const setRefreshInterval = useCallback(
    debounce((refreshIntervalUpdate: RefreshInterval) => {
      setGlobalState('refreshInterval', refreshIntervalUpdate, true);
    }, 200),
    [setGlobalState]
  );

  const [isLoading, setIsLoading] = useState(false);
  const [time, setTime] = useState(timefilter.getTime());
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState(getRecentlyUsedRanges());
  const [isAutoRefreshSelectorEnabled, setIsAutoRefreshSelectorEnabled] = useState(
    timefilter.isAutoRefreshSelectorEnabled()
  );
  const [isTimeRangeSelectorEnabled, setIsTimeRangeSelectorEnabled] = useState(
    timefilter.isTimeRangeSelectorEnabled()
  );

  const dateFormat = config.get('dateFormat');
  const timePickerQuickRanges = config.get<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES
  );

  const commonlyUsedRanges = useMemo(
    () =>
      timePickerQuickRanges.map(({ from, to, display }) => ({
        start: from,
        end: to,
        label: display,
      })),
    [timePickerQuickRanges]
  );

  useEffect(() => {
    const subscriptions = new Subscription();

    subscriptions.add(
      httpService.getLoadingCount$.subscribe((v) => {
        setIsLoading(v !== 0);
      })
    );

    const timeUpdate$ = timefilter.getTimeUpdate$();
    if (timeUpdate$ !== undefined) {
      subscriptions.add(
        timeUpdate$.subscribe((v) => {
          setTime(timefilter.getTime());
        })
      );
    }
    const enabledUpdated$ = timefilter.getEnabledUpdated$();
    if (enabledUpdated$ !== undefined) {
      subscriptions.add(
        enabledUpdated$.subscribe((w) => {
          setIsAutoRefreshSelectorEnabled(timefilter.isAutoRefreshSelectorEnabled());
          setIsTimeRangeSelectorEnabled(timefilter.isTimeRangeSelectorEnabled());
        })
      );
    }

    return function cleanup() {
      subscriptions.unsubscribe();
    };
  }, []);

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

  return isAutoRefreshSelectorEnabled || isTimeRangeSelectorEnabled ? (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      className="mlNavigationMenu__datePickerWrapper"
    >
      <EuiFlexItem grow={false}>
        <EuiSuperDatePicker
          isLoading={isLoading}
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
          commonlyUsedRanges={commonlyUsedRanges}
        />
      </EuiFlexItem>

      {isTimeRangeSelectorEnabled ? null : (
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            color="primary"
            iconType={'refresh'}
            onClick={() => updateLastRefresh()}
            data-test-subj={`mlRefreshPageButton${isLoading ? ' loading' : ' loaded'}`}
            isLoading={isLoading}
          >
            <FormattedMessage id="xpack.ml.pageRefreshButton" defaultMessage="Refresh" />
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  ) : null;
};
