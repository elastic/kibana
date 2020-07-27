/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React from 'react';
import { isEmpty, isEqual, pickBy } from 'lodash';
import { fromQuery, toQuery } from '../Links/url_helpers';
import { history } from '../../../utils/history';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { clearCache } from '../../../services/rest/callApi';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { UI_SETTINGS } from '../../../../../../../src/plugins/data/common';
import {
  TimePickerQuickRange,
  TimePickerTimeDefaults,
  TimePickerRefreshInterval,
} from './typings';

function removeUndefinedAndEmptyProps<T extends object>(obj: T): Partial<T> {
  return pickBy(obj, (value) => value !== undefined && !isEmpty(String(value)));
}

export function DatePicker() {
  const location = useLocation();
  const { core } = useApmPluginContext();

  const timePickerQuickRanges = core.uiSettings.get<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES
  );

  const timePickerTimeDefaults = core.uiSettings.get<TimePickerTimeDefaults>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );

  const timePickerRefreshIntervalDefaults = core.uiSettings.get<
    TimePickerRefreshInterval
  >(UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS);

  const DEFAULT_VALUES = {
    rangeFrom: timePickerTimeDefaults.from,
    rangeTo: timePickerTimeDefaults.to,
    refreshPaused: timePickerRefreshIntervalDefaults.pause,
    /*
     * Must be replaced by timePickerRefreshIntervalDefaults.value when this issue is fixed.
     * https://github.com/elastic/kibana/issues/70562
     */
    refreshInterval: 10000,
  };

  const commonlyUsedRanges = timePickerQuickRanges.map(
    ({ from, to, display }) => ({
      start: from,
      end: to,
      label: display,
    })
  );

  const { urlParams, refreshTimeRange } = useUrlParams();

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
    refreshInterval,
  }: {
    isPaused: boolean;
    refreshInterval: number;
  }) {
    updateUrl({ refreshPaused: isPaused, refreshInterval });
  }

  function onTimeChange({ start, end }: { start: string; end: string }) {
    updateUrl({ rangeFrom: start, rangeTo: end });
  }

  const { rangeFrom, rangeTo, refreshPaused, refreshInterval } = urlParams;
  const timePickerURLParams = removeUndefinedAndEmptyProps({
    rangeFrom,
    rangeTo,
    refreshPaused,
    refreshInterval,
  });

  const nextParams = {
    ...DEFAULT_VALUES,
    ...timePickerURLParams,
  };
  if (!isEqual(nextParams, timePickerURLParams)) {
    updateUrl(nextParams);
  }

  return (
    <EuiSuperDatePicker
      start={rangeFrom}
      end={rangeTo}
      isPaused={refreshPaused}
      refreshInterval={refreshInterval}
      onTimeChange={onTimeChange}
      onRefresh={({ start, end }) => {
        clearCache();
        refreshTimeRange({ rangeFrom: start, rangeTo: end });
      }}
      onRefreshChange={onRefreshChange}
      showUpdateButton={true}
      commonlyUsedRanges={commonlyUsedRanges}
    />
  );
}
