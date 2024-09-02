/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment/moment';
import { calculateAuto } from '@kbn/calculate-auto';

export function getBucketSizeFromTimeRangeAndBucketCount(
  timeFrom: number,
  timeTo: number,
  numBuckets: number
): number {
  const duration = moment.duration(timeTo - timeFrom, 'ms');

  return Math.max(calculateAuto.near(numBuckets, duration)?.asSeconds() ?? 0, 60);
}

export function getLogRatePerMinute({
  logCount,
  timeFrom,
  timeTo,
}: {
  logCount: number;
  timeFrom: number;
  timeTo: number;
}) {
  const durationAsMinutes = (timeTo - timeFrom) / 1000 / 60;
  return logCount / durationAsMinutes;
}

export function getLogErrorRate({
  logCount,
  logErrorCount = 0,
}: {
  logCount: number;
  logErrorCount?: number;
}) {
  return logErrorCount / logCount;
}
