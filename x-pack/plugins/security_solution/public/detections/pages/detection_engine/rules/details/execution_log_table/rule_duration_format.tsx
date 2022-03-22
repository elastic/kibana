/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';
import moment from 'moment';
import React, { useMemo } from 'react';

interface Props {
  duration: number;
  isMillis?: boolean;
  allowZero?: boolean;
}

export function getFormattedDuration(value: number) {
  if (!value) {
    return '00:00';
  }
  const duration = moment.duration(value);
  const hours = Math.floor(duration.asHours()).toString().padStart(2, '0');
  const minutes = Math.floor(duration.asMinutes()).toString().padStart(2, '0');
  const seconds = duration.seconds().toString().padStart(2, '0');
  const ms = duration.milliseconds().toString().padStart(3, '0');
  return `${hours}:${minutes}:${seconds}:${ms}`;
}

export function getFormattedMilliseconds(value: number) {
  const formatted = numeral(value).format('0,0');
  return `${formatted} ms`;
}

/**
 * Formats duration as (hh:mm:ss:SSS)
 * @param props duration default as nanos, set isMillis:true to pass in ms
 * @constructor
 */
const RuleDurationFormatComponent = (props: Props) => {
  const { duration, isMillis = false, allowZero = true } = props;

  const formattedDuration = useMemo(() => {
    // Durations can be buggy and return negative
    if (allowZero && duration >= 0) {
      return getFormattedDuration(isMillis ? duration * 1000 : duration);
    }
    return 'N/A';
  }, [allowZero, duration, isMillis]);

  return <span data-test-subj="rule-duration-format-value">{formattedDuration}</span>;
};

export const RuleDurationFormat = React.memo(RuleDurationFormatComponent);
RuleDurationFormat.displayName = 'RuleDurationFormat';
