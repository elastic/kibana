/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parse } from 'query-string';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { UI_SETTINGS } from '../../../../../src/plugins/data/common/constants';
import type { TimePickerTime } from '../components/shared/date_picker';
import { getAbsoluteTime } from '../utils/date';
import { useKibanaUISettings } from './use_kibana_ui_settings';

const getParsedParams = (search: string) => {
  return search ? parse(search[0] === '?' ? search.slice(1) : search, { sort: false }) : {};
};

export function useQueryParams() {
  const { from, to } = useKibanaUISettings<TimePickerTime>(UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS);

  const { rangeFrom, rangeTo } = getParsedParams(useLocation().search);

  return useMemo(() => {
    return {
      start: (rangeFrom as string) ?? from,
      end: (rangeTo as string) ?? to,
      absStart: getAbsoluteTime((rangeFrom as string) ?? from)!,
      absEnd: getAbsoluteTime((rangeTo as string) ?? to, { roundUp: true })!,
    };
  }, [rangeFrom, rangeTo, from, to]);
}
