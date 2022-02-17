/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React, { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { UI_SETTINGS, useKibanaUISettings } from '../../../hooks/use_kibana_ui_settings';
import { fromQuery, toQuery } from '../../../utils/url';
import { TimePickerQuickRange } from './typings';
import { ObservabilityPublicPluginsStart } from '../../../plugin';

export interface DatePickerProps {
  rangeFrom?: string;
  rangeTo?: string;
  refreshPaused?: boolean;
  refreshInterval?: number;
  onTimeRangeRefresh?: (range: { start: string; end: string }) => void;
}

export function DatePicker({
  rangeFrom,
  rangeTo,
  refreshPaused,
  refreshInterval,
  onTimeRangeRefresh,
}: DatePickerProps) {
  const location = useLocation();
  const history = useHistory();
  const { data } = useKibana<ObservabilityPublicPluginsStart>().services;

  useEffect(() => {
    // set time if both to and from are given in the url
    if (rangeFrom && rangeTo) {
      data.query.timefilter.timefilter.setTime({
        from: rangeFrom,
        to: rangeTo,
      });
    }
  }, [data, rangeFrom, rangeTo]);

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
      onRefresh={onTimeRangeRefresh}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export default DatePicker;
