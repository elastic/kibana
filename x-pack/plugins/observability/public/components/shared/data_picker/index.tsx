/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { UI_SETTINGS, useKibanaUISettings } from '../../../hooks/use_kibana_ui_settings';
import { fromQuery, toQuery } from '../../../utils/url';

export interface TimePickerTime {
  from: string;
  to: string;
}

export interface TimePickerQuickRange extends TimePickerTime {
  display: string;
}

export interface TimePickerRefreshInterval {
  pause: boolean;
  value: number;
}

interface Props {
  rangeFrom: string;
  rangeTo: string;
  refreshPaused: boolean;
  refreshInterval: number;
}

export const DatePicker = ({ rangeFrom, rangeTo, refreshPaused, refreshInterval }: Props) => {
  const location = useLocation();
  const history = useHistory();

  const timePickerQuickRanges = useKibanaUISettings<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES
  );

  const commonlyUsedRanges = timePickerQuickRanges.map(({ from, to, display }) => ({
    start: from,
    end: to,
    label: display,
  }));

  function updateUrl(nextQuery: {
    rangeFrom?: string;
    rangeTo?: string;
    refreshPaused?: boolean;
    refreshInterval?: number;
  }) {
    history.push({
      ...location,
      search: fromQuery({
        ...toQuery(location.search),
        ...nextQuery,
      }),
    });
  }

  function onRefreshChange({
    isPaused,
    refreshInterval: interval,
  }: {
    isPaused: boolean;
    refreshInterval: number;
  }) {
    updateUrl({ refreshPaused: isPaused, refreshInterval: interval });
  }

  function onTimeChange({ start, end }: { start: string; end: string }) {
    updateUrl({ rangeFrom: start, rangeTo: end });
  }

  return (
    <EuiSuperDatePicker
      start={rangeFrom}
      end={rangeTo}
      onTimeChange={onTimeChange}
      isPaused={refreshPaused}
      refreshInterval={refreshInterval}
      onRefreshChange={onRefreshChange}
      commonlyUsedRanges={commonlyUsedRanges}
      onRefresh={onTimeChange}
    />
  );
};
