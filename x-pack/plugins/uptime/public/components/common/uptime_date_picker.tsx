/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useContext } from 'react';
import { EuiSuperDatePicker } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { useUrlParams } from '../../hooks';
import { CLIENT_DEFAULTS } from '../../../common/constants';
import { UptimeRefreshContext, UptimeSettingsContext } from '../../contexts';
import { setDateRange } from '../../state/actions';
import { dateRangeSelector } from '../../state/selectors';

export interface CommonlyUsedRange {
  from: string;
  to: string;
  display: string;
}

export const UptimeDatePicker: React.FC = () => {
  const dispatch = useDispatch();
  const onTimeChange = useCallback(
    ({ start, end }: SuperDateRangePickerRangeChangedEvent) => {
      dispatch(setDateRange({ from: start, to: end }));
    },
    [dispatch]
  );
  const dateRange = useSelector(dateRangeSelector);
  console.log('date range from SDP', dateRange);
  return <UptimeDatePickerComponent {...dateRange} onTimeChange={onTimeChange} />;
};

interface Props {
  from: string;
  to: string;
  onTimeChange: (e: SuperDateRangePickerRangeChangedEvent) => void;
}

export const UptimeDatePickerComponent: React.FC<Props> = ({
  from: start,
  to: end,
  onTimeChange,
}) => {
  const [getUrlParams, updateUrl] = useUrlParams();
  const { autorefreshInterval, autorefreshIsPaused } = getUrlParams();
  const { commonlyUsedRanges } = useContext(UptimeSettingsContext);
  const { refreshApp } = useContext(UptimeRefreshContext);

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
      onTimeChange={(e) => {
        onTimeChange(e);
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
