/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useContext } from 'react';
import { EuiSuperDatePicker, OnTimeChangeProps } from '@elastic/eui';
import { useDispatch, useSelector } from 'react-redux';
import { ApplyRefreshInterval } from '@elastic/eui/src/components/date_picker/types';
import { CLIENT_DEFAULTS } from '../../../common/constants';
import { UptimeRefreshContext, UptimeSettingsContext } from '../../contexts';
import { setDateRange, setUiState } from '../../state/actions';
import { uiSelector } from '../../state/selectors';

export interface CommonlyUsedRange {
  from: string;
  to: string;
  display: string;
}

export const UptimeDatePicker: React.FC = () => {
  const dispatch = useDispatch();
  const onTimeChange = useCallback(
    ({ start, end }: OnTimeChangeProps) => {
      dispatch(setDateRange({ from: start, to: end }));
    },
    [dispatch]
  );
  const onRefreshChange: ApplyRefreshInterval = useCallback(
    ({ isPaused: autorefreshIsPaused, refreshInterval: autorefreshInterval }) => {
      dispatch(
        setUiState({
          autorefreshIsPaused,
          autorefreshInterval,
        })
      );
    },
    [dispatch]
  );
  const { autorefreshInterval, autorefreshIsPaused, dateRange } = useSelector(uiSelector);
  return (
    <UptimeDatePickerComponent
      autorefreshIsPaused={autorefreshIsPaused}
      autorefreshInterval={autorefreshInterval}
      {...dateRange}
      onRefreshChange={onRefreshChange}
      onTimeChange={onTimeChange}
    />
  );
};

interface Props {
  autorefreshIsPaused: boolean;
  autorefreshInterval: number;
  from: string;
  to: string;
  onRefreshChange: ApplyRefreshInterval;
  onTimeChange: (e: OnTimeChangeProps) => void;
}

export const UptimeDatePickerComponent: React.FC<Props> = ({
  autorefreshInterval,
  autorefreshIsPaused,
  from: start,
  to: end,
  onRefreshChange,
  onTimeChange,
}) => {
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
      onRefreshChange={onRefreshChange}
    />
  );
};
