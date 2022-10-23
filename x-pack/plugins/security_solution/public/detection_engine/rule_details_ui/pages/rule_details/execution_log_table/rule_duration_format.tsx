/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useMemo } from 'react';

import * as i18n from './translations';

interface Props {
  duration: number;
  isSeconds?: boolean;
  allowZero?: boolean;
}

export const getFormattedDuration = (value: number) => {
  if (!value) {
    return '00:00:00:000';
  }
  const duration = moment.duration(value);
  const days = Math.floor(duration.asDays()).toString().padStart(3, '0');
  const hours = Math.floor(duration.asHours() % 24)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor(duration.asMinutes() % 60)
    .toString()
    .padStart(2, '0');
  const seconds = duration.seconds().toString().padStart(2, '0');
  const ms = duration.milliseconds().toString().padStart(3, '0');

  if (Math.floor(duration.asDays()) > 0) {
    if (Math.floor(duration.asDays()) >= 365) {
      return i18n.GREATER_THAN_YEAR;
    } else {
      return `${days}:${hours}:${minutes}:${seconds}:${ms}`;
    }
  } else {
    return `${hours}:${minutes}:${seconds}:${ms}`;
  }
};

/**
 * Formats duration as (hh:mm:ss:SSS) by default, overflowing to include days
 * as (ddd:hh:mm:ss:SSS) if necessary, and then finally to `> 1 Year`
 * @param props duration as millis, set isSeconds:true to pass in seconds
 * @constructor
 */
const RuleDurationFormatComponent = (props: Props) => {
  const { duration, isSeconds = false, allowZero = true } = props;

  const formattedDuration = useMemo(() => {
    // Durations can be buggy and return negative
    if (allowZero && duration >= 0) {
      return getFormattedDuration(isSeconds ? duration * 1000 : duration);
    }
    return i18n.DURATION_NOT_AVAILABLE;
  }, [allowZero, duration, isSeconds]);

  return <span data-test-subj="rule-duration-format-value">{formattedDuration}</span>;
};

export const RuleDurationFormat = React.memo(RuleDurationFormatComponent);
RuleDurationFormat.displayName = 'RuleDurationFormat';
