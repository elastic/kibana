/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useKibanaDateFormat } from '../../../../hooks/use_kibana_date_format';

/**
 * Formats the microseconds (µ) into either milliseconds (ms) or seconds (s) based on the duration value
 * @param duration
 * @param isMilli
 */
export const formatTestDuration = (duration = 0, isMilli = false) => {
  const secs = isMilli ? duration / 1e3 : duration / 1e6;

  if (secs >= 60) {
    return `${(secs / 60).toFixed(1)} min`;
  }

  if (secs >= 1) {
    return `${secs.toFixed(1)} s`;
  }

  if (isMilli) {
    return `${duration.toFixed(0)} ms`;
  }

  return `${(duration / 1000).toFixed(0)} ms`;
};

export function formatTestRunAt(timestamp: string, format: string) {
  const stampedMoment = moment(timestamp);
  return stampedMoment.format(format);
}

export function useFormatTestRunAt(timestamp?: string) {
  let format = useKibanaDateFormat();
  if (!timestamp) {
    return '';
  }
  if (format.endsWith('.SSS')) {
    format = format.replace('.SSS', '');
  }
  return formatTestRunAt(timestamp, format);
}
