/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO Consolidate with duplicate component `DatePickerWrapper` in
// `x-pack/plugins/aiops/public/components/date_picker_wrapper/date_picker_wrapper.tsx`

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Subscription } from 'rxjs';
import { debounce } from 'lodash';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
  OnRefreshProps,
  OnTimeChangeProps,
} from '@elastic/eui';

import type { TimeRange } from '@kbn/es-query';
import { TimeHistoryContract, UI_SETTINGS } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { useUrlState } from '@kbn/ml-url-state';
import { wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  useRefreshIntervalUpdates,
  useTimeRangeUpdates,
} from '../../../index_data_visualizer/hooks/use_time_filter';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { dataVisualizerRefresh$ } from '../../../index_data_visualizer/services/timefilter_refresh_service';

const DEFAULT_REFRESH_INTERVAL_MS = 5000;
const DATE_PICKER_MAX_WIDTH = 540;

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
  dataVisualizerRefresh$.next({ lastRefresh: Date.now(), timeRange });
}

// FIXME: Consolidate this component with ML and AIOps's component
export const DatePickerWrapper: FC<{
  isAutoRefreshOnly?: boolean;
  showRefresh?: boolean;
  compact?: boolean;
}> = ({ isAutoRefreshOnly, showRefresh, compact = false }) => {
  const {
    services,
    notifications: { toasts },
  } = useDataVisualizerKibana();
  const config = services.uiSettings;
  const theme$ = services.theme.theme$;

  const { timefilter, history } = services.data.query.timefilter;

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
      const isTooShort = refreshInterval.value < DEFAULT_REFRESH_INTERVAL_MS;

      // Only warn about short interval with enabled auto-refresh.
      if (!isTooShort || refreshInterval.pause) return;

      toasts.warning({
        title: i18n.translate(
          'xpack.dataVisualizer.index.datePicker.shortRefreshIntervalURLWarningMessage',
          {
            defaultMessage:
              'The refresh interval in the URL is shorter than the minimum supported by Machine Learning.',
          }
        ),
        body: wrapWithTheme(
          <EuiButton
            onClick={setRefreshInterval.bind(null, {
              pause: refreshInterval.pause,
              value: DEFAULT_REFRESH_INTERVAL_MS,
            })}
          >
            <FormattedMessage
              id="xpack.dataVisualizer.index.pageRefreshResetButton"
              defaultMessage="Set to {defaultInterval}"
              values={{
                defaultInterval: `${DEFAULT_REFRESH_INTERVAL_MS / 1000}s`,
              }}
            />
          </EuiButton>,
          theme$
        ),
        toastLifeTimeMs: 30000,
      });
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
    setRefreshInterval({ pause, value });
  }

  return isAutoRefreshSelectorEnabled || isTimeRangeSelectorEnabled ? (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      data-test-subj="mlNavigationMenuDatePickerWrapper"
    >
      <EuiFlexItem
        grow={false}
        css={
          compact
            ? {
                maxWidth: DATE_PICKER_MAX_WIDTH,
              }
            : null
        }
      >
        <EuiSuperDatePicker
          start={time.from}
          end={time.to}
          isPaused={refreshInterval.pause}
          isAutoRefreshOnly={!isTimeRangeSelectorEnabled || isAutoRefreshOnly}
          refreshInterval={refreshInterval.value || DEFAULT_REFRESH_INTERVAL_MS}
          onTimeChange={updateTimeFilter}
          onRefresh={updateLastRefresh}
          onRefreshChange={updateInterval}
          recentlyUsedRanges={recentlyUsedRanges}
          dateFormat={dateFormat}
          commonlyUsedRanges={commonlyUsedRanges}
          updateButtonProps={{ iconOnly: compact }}
        />
      </EuiFlexItem>

      {showRefresh === true || !isTimeRangeSelectorEnabled ? (
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            color="primary"
            iconType={'refresh'}
            onClick={() => updateLastRefresh()}
            data-test-subj="dataVisualizerRefreshPageButton"
          >
            <FormattedMessage
              id="xpack.dataVisualizer.index.pageRefreshButton"
              defaultMessage="Refresh"
            />
          </EuiButton>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  ) : null;
};
