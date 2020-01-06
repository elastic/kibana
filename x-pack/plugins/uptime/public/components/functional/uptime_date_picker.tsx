/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React from 'react';
import { useUrlParams } from '../../hooks';
import { CLIENT_DEFAULTS } from '../../../common/constants';

// TODO: when EUI exports types for this, this should be replaced
interface SuperDateRangePickerRangeChangedEvent {
  start: string;
  end: string;
}

interface SuperDateRangePickerRefreshChangedEvent {
  isPaused: boolean;
  refreshInterval?: number;
}

export interface CommonlyUsedRange {
  from: string;
  to: string;
  display: string;
}

interface Props {
  refreshApp: () => void;
  commonlyUsedRanges?: CommonlyUsedRange[];
}

type UptimeDatePickerProps = Props;

export const UptimeDatePicker = ({ refreshApp, commonlyUsedRanges }: UptimeDatePickerProps) => {
  const [getUrlParams, updateUrl] = useUrlParams();
  const { autorefreshInterval, autorefreshIsPaused, dateRangeStart, dateRangeEnd } = getUrlParams();

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
      start={dateRangeStart}
      end={dateRangeEnd}
      commonlyUsedRanges={euiCommonlyUsedRanges}
      isPaused={autorefreshIsPaused}
      refreshInterval={autorefreshInterval}
      onTimeChange={({ start, end }: SuperDateRangePickerRangeChangedEvent) => {
        updateUrl({ dateRangeStart: start, dateRangeEnd: end });
        refreshApp();
      }}
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
