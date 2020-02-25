/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { useMemo } from 'react';

import { useKibanaUiSetting } from '../utils/use_kibana_ui_setting';

const getFormattedTime = (
  time: number,
  userFormat: string | undefined,
  fallbackFormat: string = 'Y-MM-DD HH:mm:ss.SSS'
) => {
  return userFormat ? moment(time).format(userFormat) : moment(time).format(fallbackFormat);
};

interface UseFormattedTimeOptions {
  format?: 'dateTime' | 'time';
  fallbackFormat?: string;
}

export const useFormattedTime = (
  time: number,
  { format = 'dateTime', fallbackFormat }: UseFormattedTimeOptions = {}
) => {
  // `dateFormat:scaled` is an array of `[key, format]` tuples.
  // The hook might return `undefined`, so use a sane default for the `find` later.
  const scaledTuples = useKibanaUiSetting('dateFormat:scaled')[0] || [['', undefined]];

  const formatMap = {
    dateTime: useKibanaUiSetting('dateFormat')[0],
    time: scaledTuples.find(([key]: [string, string]) => key === '')[1],
  };

  const dateFormat = formatMap[format];
  const formattedTime = useMemo(() => getFormattedTime(time, dateFormat, fallbackFormat), [
    time,
    dateFormat,
    fallbackFormat,
  ]);

  return formattedTime;
};
