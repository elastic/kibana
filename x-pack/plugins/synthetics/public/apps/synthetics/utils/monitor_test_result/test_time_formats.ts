/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { i18n } from '@kbn/i18n';

/**
 * Formats the microseconds (µ) into either milliseconds (ms) or seconds (s) based on the duration value
 * @param us {number} duration value in microseconds
 */
export const formatTestDuration = (us?: number) => {
  const microSecs = us ?? 0;
  const secs = microSecs / (1000 * 1000);
  if (secs >= 1) {
    return `${secs.toFixed(1)} s`;
  }

  return `${(microSecs / 1000).toFixed(0)} ms`;
};

export function formatTestRunAt(timestamp: string) {
  const stampedMoment = moment(timestamp);
  const startOfToday = moment().startOf('day');
  const startOfYesterday = moment().add(-1, 'day');

  const dateStr =
    stampedMoment > startOfToday
      ? `${TODAY_LABEL}`
      : stampedMoment > startOfYesterday
      ? `${YESTERDAY_LABEL}`
      : `${stampedMoment.format('ll')} `;

  const timeStr = stampedMoment.format('HH:mm:ss');

  return `${dateStr} @ ${timeStr}`;
}

const TODAY_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.today', {
  defaultMessage: 'Today',
});

const YESTERDAY_LABEL = i18n.translate('xpack.synthetics.monitorDetails.summary.yesterday', {
  defaultMessage: 'Yesterday',
});
