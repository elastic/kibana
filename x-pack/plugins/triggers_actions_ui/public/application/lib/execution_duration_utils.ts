/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { padStart } from 'lodash';
import { RuleType } from '../../types';
import { parseDuration } from '../../../../alerting/common';

export function formatMillisForDisplay(value: number | undefined) {
  if (!value) {
    return '00:00:00.000';
  }

  const duration = moment.duration(value);
  const durationString = [duration.hours(), duration.minutes(), duration.seconds()]
    .map((v: number) => padStart(`${v}`, 2, '0'))
    .join(':');

  // add millis
  const millisString = padStart(`${duration.milliseconds()}`, 3, '0');
  return `${durationString}.${millisString}`;
}

export function shouldShowDurationWarning(
  ruleType: RuleType | undefined,
  avgDurationMillis: number
) {
  if (!ruleType || !ruleType.ruleTaskTimeout) {
    return false;
  }
  const ruleTypeTimeout: string = ruleType.ruleTaskTimeout;
  const ruleTypeTimeoutMillis: number = parseDuration(ruleTypeTimeout);
  return avgDurationMillis > ruleTypeTimeoutMillis;
}
