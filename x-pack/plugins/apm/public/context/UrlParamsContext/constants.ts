/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IUiSettingsClient } from 'kibana/public';
import { UI_SETTINGS } from '../../../../../../src/plugins/data/common';

export const TIME_RANGE_REFRESH = 'TIME_RANGE_REFRESH';
export const LOCATION_UPDATE = 'LOCATION_UPDATE';

interface TimePickerQuickRange {
  from: string;
  to: string;
  display: string;
}

interface ITimePickerDefault {
  rangeFrom: string;
  rangeTo: string;
  refreshPaused: boolean;
  refreshInterval: number;
  quickRanges: TimePickerQuickRange[];
}

interface TimePickerRefreshInterval {
  pause: boolean;
  value: number;
}

interface TimePickerTimeDefaults {
  from: string;
  to: string;
}

export let timePickerDefault: ITimePickerDefault = {
  rangeFrom: 'now-24h',
  rangeTo: 'now',
  refreshPaused: true,
  refreshInterval: 10000,
  quickRanges: [],
};

export function getTimePickerQueryParam() {
  const { quickRanges, ...rest } = timePickerDefault;
  return rest;
}

export function setTimePickerDefaultValues({
  uiSettings,
}: {
  uiSettings: IUiSettingsClient;
}) {
  const timePickerRefreshIntervalDefaults = uiSettings.get<
    TimePickerRefreshInterval
  >(UI_SETTINGS.TIMEPICKER_REFRESH_INTERVAL_DEFAULTS);
  const timePickerTimeDefaults = uiSettings.get<TimePickerTimeDefaults>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );
  const timePickerQuickRanges = uiSettings.get<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES
  );
  timePickerDefault = {
    rangeFrom: timePickerTimeDefaults.from,
    rangeTo: timePickerTimeDefaults.to,
    refreshPaused: timePickerRefreshIntervalDefaults.pause,
    /*
     * Must be replaced by timePickerRefreshIntervalDefaults.value when this issue is fixed.
     * https://github.com/elastic/kibana/issues/70562
     */
    refreshInterval: 10000,
    quickRanges: timePickerQuickRanges,
  };
}
