/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'query-string';
import { useLocation } from 'react-router-dom';
import { TimePickerTime } from '../components/shared/data_picker';
import { getAbsoluteTime } from '../utils/date';
import { UI_SETTINGS, useKibanaUISettings } from './use_kibana_ui_settings';
import { usePluginContext } from './use_plugin_context';

const getParsedParams = (search: string) => {
  return search ? parse(search[0] === '?' ? search.slice(1) : search, { sort: false }) : {};
};

export function useTimeRange() {
  const { plugins } = usePluginContext();

  const timePickerTimeDefaults = useKibanaUISettings<TimePickerTime>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );

  const timePickerSharedState = plugins.data.query.timefilter.timefilter.getTime();

  const { rangeFrom, rangeTo } = getParsedParams(useLocation().search);

  const _rangeFrom = (rangeFrom ??
    timePickerSharedState.from ??
    timePickerTimeDefaults.from) as string;
  const _rangeTo = (rangeTo ?? timePickerSharedState.to ?? timePickerTimeDefaults.to) as string;

  return {
    rangeFrom: _rangeFrom,
    rangeTo: _rangeTo,
    absStart: getAbsoluteTime(_rangeFrom)!,
    absEnd: getAbsoluteTime(_rangeTo, { roundUp: true })!,
  };
}
