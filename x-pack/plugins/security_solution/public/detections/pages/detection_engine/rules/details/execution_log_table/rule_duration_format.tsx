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
  allowZero?: boolean;
}

export function getFormattedDuration(value: number) {
  if (!value) {
    return '00:00';
  }
  const duration = moment.duration(value);
  const minutes = Math.floor(duration.asMinutes()).toString().padStart(2, '0');
  const seconds = duration.seconds().toString().padStart(2, '0');
  const ms = duration.milliseconds().toString().padStart(3, '0');
  return `${minutes}:${seconds}:${ms}`;
}

export function getFormattedMilliseconds(value: number) {
  const formatted = numeral(value).format('0,0');
  return `${formatted} ms`;
}

const RuleDurationFormatComponent = (props: Props) => {
  const { duration, allowZero = true } = props;

  const formattedDuration = useMemo(() => {
    // Durations can be buggy and return negative
    if (allowZero && duration >= 0) {
      return getFormattedDuration(duration);
    }
    return 'N/A';
  }, [duration, allowZero]);

  return <span data-test-subj="rule-duration-format-value">{formattedDuration}</span>;
};

export const RuleDurationFormat = React.memo(RuleDurationFormatComponent);
RuleDurationFormat.displayName = 'RuleDurationFormat';
