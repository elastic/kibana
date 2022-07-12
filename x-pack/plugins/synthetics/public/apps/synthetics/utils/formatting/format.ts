/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

// one second = 1 million micros
const ONE_SECOND_AS_MICROS = 1000000;

// the limit for converting to seconds is >= 1 sec
const MILLIS_LIMIT = ONE_SECOND_AS_MICROS * 1;

const NUM_MICROSECONDS_IN_MILLISECOND = 1000;

/**
 * This simply converts microseconds to milliseconds. People tend to prefer ms to us
 * when visualizing request duration times.
 */
export const microsToMillis = (microseconds: number | null): number | null => {
  if (!microseconds && microseconds !== 0) return null;
  return Math.floor(microseconds / NUM_MICROSECONDS_IN_MILLISECOND);
};

export const formatDuration = (durationMicros: number) => {
  if (durationMicros < MILLIS_LIMIT) {
    return i18n.translate('xpack.synthetics.pingList.durationMsColumnFormatting', {
      values: { millis: microsToMillis(durationMicros) },
      defaultMessage: '{millis} ms',
    });
  }
  const seconds = (durationMicros / ONE_SECOND_AS_MICROS).toFixed(0);

  // we format seconds with correct pluralization here and not for `ms` because it is much more likely users
  // will encounter times of exactly '1' second.
  if (seconds === '1') {
    return i18n.translate('xpack.synthetics.pingist.durationSecondsColumnFormatting.singular', {
      values: { seconds },
      defaultMessage: '{seconds} second',
    });
  }
  return i18n.translate('xpack.synthetics.pingist.durationSecondsColumnFormatting', {
    values: { seconds },
    defaultMessage: '{seconds} seconds',
  });
};
