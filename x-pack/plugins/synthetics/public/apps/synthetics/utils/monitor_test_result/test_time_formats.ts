/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { useKibanaDateFormat } from '../../../../hooks/use_kibana_date_format';

/**
 * Formats the microseconds (µ) into either milliseconds (ms) or seconds (s) based on the duration value
 * @param duration
 * @param isMilli
 */
export const formatTestDuration = (duration = 0, isMilli = false) => {
  const secs = isMilli ? duration / 1e3 : duration / 1e6;

  const hours = Math.floor(secs / 3600);

  if (hours >= 1) {
    return i18n.translate('xpack.synthetics.errorDetails.errorDuration.hours', {
      defaultMessage: '{value} hours',
      values: { value: hours },
    });
  }

  if (secs >= 60) {
    return i18n.translate('xpack.synthetics.errorDetails.errorDuration.minutes', {
      defaultMessage: '{value} mins',
      values: { value: parseFloat((secs / 60).toFixed(1)) },
    });
  }

  if (secs >= 1) {
    return i18n.translate('xpack.synthetics.errorDetails.errorDuration.seconds', {
      defaultMessage: '{value} sec',
      values: { value: parseFloat(secs.toFixed(1)) },
    });
  }

  if (isMilli) {
    return i18n.translate('xpack.synthetics.errorDetails.errorDuration.milliseconds', {
      defaultMessage: '{value} ms',
      values: { value: duration.toFixed(0) },
    });
  }

  return i18n.translate('xpack.synthetics.errorDetails.errorDuration.microseconds', {
    defaultMessage: '{value} ms',
    values: { value: (duration / 1000).toFixed(0) },
  });
};

export function formatTestRunAt(timestamp: string, format: string) {
  const stampedMoment = moment(timestamp);
  return stampedMoment.format(format);
}

export function useDateFormatForTest() {
  let format = useKibanaDateFormat();

  if (format.endsWith('.SSS')) {
    format = format.replace('.SSS', '');
  }
  return format;
}

export function useFormatTestRunAt(timestamp?: string) {
  const format = useDateFormatForTest();

  if (!timestamp) {
    return '';
  }
  return formatTestRunAt(timestamp, format);
}
