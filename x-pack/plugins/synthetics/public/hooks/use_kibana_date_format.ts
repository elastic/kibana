/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Moment } from 'moment';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectScaledDateFormat, setScaledDateAction } from '../apps/synthetics/state';
import { kibanaService } from '../utils/kibana_service';

export const DEFAULT_FORMAT = 'MMM D, YYYY @ HH:mm:ss';

type AcceptedInputs = Moment | Date | number | string | undefined;

function toNumeric(timestamp: AcceptedInputs): number | undefined {
  if (moment.isMoment(timestamp) || timestamp instanceof Date) return timestamp.valueOf();
  if (typeof timestamp === 'string') {
    return Number.isNaN(Number(timestamp)) ? new Date(timestamp).valueOf() : Number(timestamp);
  }
  return timestamp;
}

function isExpectedFormat(maybeValue: unknown): maybeValue is [string, string] {
  return (
    Array.isArray(maybeValue) &&
    maybeValue.length === 2 &&
    typeof maybeValue[0] === 'string' &&
    typeof maybeValue[1] === 'string'
  );
}

export function getDateFormat(bounds: { [key: number]: string }, diff: number): string | undefined {
  let format: string | undefined;
  for (const bound of Object.entries(bounds)) {
    if (diff > Number(bound[0])) {
      format = bound[1];
    } else break;
  }
  return format;
}

const INVALID_FORMAT_MESSAGE =
  'Invalid date format specified. See Kibana Advanced Settings key `dateFormat:scaled`.';

export function useKibanaDateFormat(timestamp: AcceptedInputs): string {
  const now = moment.now();
  const numericTimestamp = toNumeric(timestamp);
  const dispatch = useDispatch();
  const { format, formatString } = useSelector(selectScaledDateFormat);
  const value = kibanaService.core.uiSettings.getAll()['dateFormat:scaled']?.value ?? '';
  const defaultFormat = kibanaService.core.uiSettings.get('dateFormat', DEFAULT_FORMAT);

  useEffect(() => {
    if (typeof value === 'string' && value !== formatString) {
      const newFormat = JSON.parse(value);

      // array for simple sorting
      const bounds: Array<{ bound: number; format: string }> = [];
      for (const scale of newFormat) {
        if (!isExpectedFormat(scale)) throw Error(INVALID_FORMAT_MESSAGE);
        const bound = moment.duration(scale[0]).asMilliseconds();
        bounds.push({ bound, format: scale[1] });
      }
      bounds.sort(({ bound: a }, { bound: b }) => a - b);
      const action = setScaledDateAction({
        formatString: value,
        format: bounds.reduce((prev, cur) => ({ ...prev, [cur.bound]: cur.format }), {}),
      });
      dispatch(action);
    }
  }, [dispatch, formatString, value]);

  if (format === null || numericTimestamp === undefined) {
    return defaultFormat;
  }

  return getDateFormat(format, now - numericTimestamp) ?? defaultFormat;
}
