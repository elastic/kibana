/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import moment from 'moment-timezone';

type TimeUnit = 'hours' | 'minutes' | 'seconds' | 'milliseconds';

function getTimeFormat(timeUnit: TimeUnit) {
  switch (timeUnit) {
    case 'hours':
      return 'HH';
    case 'minutes':
      return 'HH:mm';
    case 'seconds':
      return 'HH:mm:ss';
    case 'milliseconds':
      return 'HH:mm:ss.SSS';
    default:
      return '';
  }
}

function formatTimezone(momentTime: moment.Moment) {
  const DEFAULT_TIMEZONE_FORMAT = 'Z';
  const utcOffsetHours = momentTime.utcOffset() / 60;
  const customTimezoneFormat = utcOffsetHours > 0 ? `+${utcOffsetHours}` : utcOffsetHours;
  const utcOffsetFormatted = Number.isInteger(utcOffsetHours)
    ? customTimezoneFormat
    : DEFAULT_TIMEZONE_FORMAT;
  return momentTime.format(`(UTC${utcOffsetFormatted})`);
}

export function asAbsoluteDateTime(time: number, timeUnit: TimeUnit = 'milliseconds') {
  const momentTime = moment(time);
  const formattedTz = formatTimezone(momentTime);
  return momentTime.format(`MMM D, YYYY, ${getTimeFormat(timeUnit)} ${formattedTz}`);
}

interface Props {
  /**
   * timestamp in milliseconds
   */
  time: number;
  timeUnit?: TimeUnit;
}

export function TimestampTooltip({ time, timeUnit = 'milliseconds' }: Props) {
  const absoluteTimeLabel = asAbsoluteDateTime(time, timeUnit);

  return (
    <EuiToolTip content={absoluteTimeLabel}>
      <span tabIndex={0}>{absoluteTimeLabel}</span>
    </EuiToolTip>
  );
}
