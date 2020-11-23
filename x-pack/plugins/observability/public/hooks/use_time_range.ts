/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'query-string';
import { useLocation } from 'react-router-dom';
import { TimePickerTime } from '../components/shared/date_picker';
import { getAbsoluteTime } from '../utils/date';
import { UI_SETTINGS, useKibanaUISettings } from './use_kibana_ui_settings';
import { usePluginContext } from './use_plugin_context';

const getParsedParams = (search: string) => {
  return parse(search.slice(1), { sort: false });
};

export function useTimeRange() {
  const { plugins } = usePluginContext();

  const timePickerTimeDefaults = useKibanaUISettings<TimePickerTime>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );

  const timePickerSharedState = plugins.data.query.timefilter.timefilter.getTime();

  const { rangeFrom, rangeTo } = getParsedParams(useLocation().search);

  const relativeStart = (rangeFrom ??
    timePickerSharedState.from ??
    timePickerTimeDefaults.from) as string;
  const relativeEnd = (rangeTo ?? timePickerSharedState.to ?? timePickerTimeDefaults.to) as string;

  return {
    relativeStart,
    relativeEnd,
    absoluteStart: getAbsoluteTime(relativeStart)!,
    absoluteEnd: getAbsoluteTime(relativeEnd, { roundUp: true })!,
  };
}
