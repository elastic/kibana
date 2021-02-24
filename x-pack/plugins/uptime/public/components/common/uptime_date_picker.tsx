/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
import { useUrlParams } from '../../hooks';
import { CLIENT_DEFAULTS } from '../../../common/constants';
import {
  UptimeRefreshContext,
  UptimeSettingsContext,
  UptimeStartupPluginsContext,
} from '../../contexts';

export interface CommonlyUsedRange {
  from: string;
  to: string;
  display: string;
}

const isUptimeDefaultDateRange = (dateRangeStart: string, dateRangeEnd: string) => {
  const { DATE_RANGE_START, DATE_RANGE_END } = CLIENT_DEFAULTS;

  return dateRangeStart === DATE_RANGE_START && dateRangeEnd === DATE_RANGE_END;
};

export const UptimeDatePicker = () => {
  const [getUrlParams, updateUrl] = useUrlParams();
  const { commonlyUsedRanges } = useContext(UptimeSettingsContext);
  const { refreshApp } = useContext(UptimeRefreshContext);

  const { data } = useContext(UptimeStartupPluginsContext);

  // read time from state and update the url
  const sharedTimeState = data?.query.timefilter.timefilter.getTime();

  const {
    autorefreshInterval,
    autorefreshIsPaused,
    dateRangeStart: start,
    dateRangeEnd: end,
  } = getUrlParams();

  useEffect(() => {
    const { from, to } = sharedTimeState ?? {};
    // if it's uptime default range, and we have shared state from kibana, let's use that
    if (isUptimeDefaultDateRange(start, end) && (from !== start || to !== end)) {
      updateUrl({ dateRangeStart: from, dateRangeEnd: to });
    } else if (from !== start || to !== end) {
      // if it's coming url. let's update shared state
      data?.query.timefilter.timefilter.setTime({ from: start, to: end });
    }

    // only need at start, rest date picker on change fucn will take care off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const euiCommonlyUsedRanges = commonlyUsedRanges
    ? commonlyUsedRanges.map(
        ({ from, to, display }: { from: string; to: string; display: string }) => {
          return {
            start: from,
            end: to,
            label: display,
          };
        }
      )
    : CLIENT_DEFAULTS.COMMONLY_USED_DATE_RANGES;

  return (
    <EuiSuperDatePicker
      start={start}
      end={end}
      commonlyUsedRanges={euiCommonlyUsedRanges}
      isPaused={autorefreshIsPaused}
      refreshInterval={autorefreshInterval}
      onTimeChange={({ start: startN, end: endN }) => {
        if (data?.query?.timefilter?.timefilter) {
          data?.query.timefilter.timefilter.setTime({ from: startN, to: endN });
        }

        updateUrl({ dateRangeStart: startN, dateRangeEnd: endN });
        refreshApp();
      }}
      onRefresh={refreshApp}
      onRefreshChange={({ isPaused, refreshInterval }) => {
        updateUrl({
          autorefreshInterval:
            refreshInterval === undefined ? autorefreshInterval : refreshInterval,
          autorefreshIsPaused: isPaused,
        });
      }}
    />
  );
};
