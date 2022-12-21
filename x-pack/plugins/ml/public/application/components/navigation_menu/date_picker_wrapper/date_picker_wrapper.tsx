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
  OnTimeChangeProps,
} from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { TimeHistoryContract } from '@kbn/data-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';

import { wrapWithTheme, toMountPoint } from '@kbn/kibana-react-plugin/public';
import { mlTimefilterRefresh$ } from '../../../services/timefilter_refresh_service';
import { useUrlState } from '../../../util/url_state';
import { useMlKibana } from '../../../contexts/kibana';
import {
  useRefreshIntervalUpdates,
  useTimeRangeUpdates,
} from '../../../contexts/kibana/use_timefilter';
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

const DEFAULT_REFRESH_INTERVAL_MS = 5000;

export const DatePickerWrapper: FC = () => {
  const { services } = useMlKibana();
  const config = services.uiSettings;
  const theme$ = services.theme.theme$;

  const { httpService } = services.mlServices;
  const { timefilter, history } = services.data.query.timefilter;
  const { displayWarningToast } = useToastNotificationService();

  const [globalState, setGlobalState] = useUrlState('_g');
  const getRecentlyUsedRanges = getRecentlyUsedRangesFactory(history);

  const timeFilterRefreshInterval = useRefreshIntervalUpdates();
  const time = useTimeRangeUpdates();

  useEffect(
    function syncTimRangeFromUrlState() {
      if (globalState?.time !== undefined) {
        timefilter.setTime({
          from: globalState.time.from,
          to: globalState.time.to,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalState?.time?.from, globalState?.time?.to, globalState?.time?.ts]
  );

  useEffect(
    function syncRefreshIntervalFromUrlState() {
      if (globalState?.refreshInterval !== undefined) {
        timefilter.setRefreshInterval({
          pause: !!globalState?.refreshInterval?.pause,
          value: globalState?.refreshInterval?.value,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalState?.refreshInterval]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setRefreshInterval = useCallback(
    debounce((refreshIntervalUpdate: RefreshInterval) => {
      setGlobalState('refreshInterval', refreshIntervalUpdate, true);
    }, 200),
    [setGlobalState]
  );

  const [isLoading, setIsLoading] = useState(false);
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState(getRecentlyUsedRanges());
  const [isAutoRefreshSelectorEnabled, setIsAutoRefreshSelectorEnabled] = useState(
    timefilter.isAutoRefreshSelectorEnabled()
  );
  const [isTimeRangeSelectorEnabled, setIsTimeRangeSelectorEnabled] = useState(
    timefilter.isTimeRangeSelectorEnabled()
  );

  const refreshInterval = useMemo(
    (): RefreshInterval => globalState?.refreshInterval ?? timeFilterRefreshInterval,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(globalState?.refreshInterval), timeFilterRefreshInterval]
  );

  useEffect(
    function warnAboutShortRefreshInterval() {
      const isResolvedFromUrlState = !!globalState?.refreshInterval;
      const isTooShort = refreshInterval.value < DEFAULT_REFRESH_INTERVAL_MS;

      // Only warn about short interval with enabled auto-refresh.
      if (!isTooShort || refreshInterval.pause) return;

      displayWarningToast(
        {
          title: isResolvedFromUrlState
            ? i18n.translate('xpack.ml.datePicker.shortRefreshIntervalURLWarningMessage', {
                defaultMessage:
                  'The refresh interval in the URL is shorter than the minimum supported by Machine Learning.',
              })
            : i18n.translate('xpack.ml.datePicker.shortRefreshIntervalTimeFilterWarningMessage', {
                defaultMessage:
                  'The refresh interval in Advanced Settings is shorter than the minimum supported by Machine Learning.',
              }),
          text: toMountPoint(
            wrapWithTheme(
              <EuiButton
                onClick={setRefreshInterval.bind(null, {
                  pause: refreshInterval.pause,
                  value: DEFAULT_REFRESH_INTERVAL_MS,
                })}
              >
                <FormattedMessage
                  id="xpack.ml.pageRefreshResetButton"
                  defaultMessage="Set to {defaultInterval}"
                  values={{
                    defaultInterval: `${DEFAULT_REFRESH_INTERVAL_MS / 1000}s`,
                  }}
                />
              </EuiButton>,
              theme$
            )
          ),
        },
        { toastLifeTimeMs: 30000 }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(refreshInterval),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(globalState?.refreshInterval),
      setRefreshInterval,
    ]
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateTimeFilter = useCallback(
    ({ start, end }: OnTimeChangeProps) => {
      setRecentlyUsedRanges(getRecentlyUsedRanges());
      setGlobalState('time', {
        from: start,
        to: end,
        ...(start === 'now' || end === 'now' ? { ts: Date.now() } : {}),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setGlobalState]
  );

  function updateInterval({
    isPaused: pause,
    refreshInterval: value,
  }: {
    isPaused: boolean;
    refreshInterval: number;
  }) {
    if (pause === false && value <= 0) {
      setRefreshInterval({ pause, value: 5000 });
    }
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
          refreshInterval={refreshInterval.value || DEFAULT_REFRESH_INTERVAL_MS}
          onTimeChange={updateTimeFilter}
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
