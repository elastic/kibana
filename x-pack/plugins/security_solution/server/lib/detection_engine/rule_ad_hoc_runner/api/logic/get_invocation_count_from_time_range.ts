/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from '@kbn/datemath';
import moment from 'moment';

export const getInvocationCountFromTimeRange = ({
  timeframeStart,
  timeframeEnd,
  interval,
}: {
  timeframeStart: string;
  timeframeEnd: string;
  interval: string;
}) => {
  const timeframeDuration =
    (moment(timeframeEnd).valueOf() / 1000 - moment(timeframeStart).valueOf() / 1000) * 1000;

  const { unit: intervalUnit, value: intervalValue } = getTimeTypeValue(interval);
  const duration = moment.duration(intervalValue, intervalUnit);
  const ruleIntervalDuration = duration.asMilliseconds();

  const invocationCount = Math.max(Math.ceil(timeframeDuration / ruleIntervalDuration), 1);

  return invocationCount;
};

export const getTimeTypeValue = (time: string): { unit: Unit; value: number } => {
  const timeObj: { unit: Unit; value: number } = {
    unit: 's',
    value: 0,
  };
  // Match any number of digits plus a time unit of s, m, h, or d
  const match = time.match(/(\d+)(s|m|h|d)(?!.\b)/g);

  if (match != null) {
    const [value, unit] = match;
    if (value && !isNaN(Number(value))) {
      timeObj.value = Number(value);
    }
    if (unit && ['s', 'm', 'd', 'h'].includes(unit)) {
      timeObj.unit = unit as Unit;
    }
  }

  return timeObj;
};
