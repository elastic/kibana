/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimePickerTime } from '../components/shared/data_picker';
import { getAbsoluteTime } from '../utils/date';
import { useKibanaUISettings, UI_SETTINGS } from './use_kibana_ui_settings';
import { usePluginContext } from './use_plugin_context';

export function useTimeRange({ rangeFrom, rangeTo }: { rangeFrom?: string; rangeTo?: string }) {
  const { plugins } = usePluginContext();
  const timePickerTimeDefaults = useKibanaUISettings<TimePickerTime>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );

  const timePickerSharedState = plugins.data.query.timefilter.timefilter.getTime();

  const _rangeFrom = rangeFrom ?? timePickerSharedState.from ?? timePickerTimeDefaults.from;
  const _rangeTo = rangeTo ?? timePickerSharedState.to ?? timePickerTimeDefaults.to;

  const absStart = getAbsoluteTime(_rangeFrom)!;
  const absEnd = getAbsoluteTime(_rangeTo, { roundUp: true })!;

  return {
    rangeFrom: _rangeFrom,
    rangeTo: _rangeTo,
    absStart,
    absEnd,
  };
}
