/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import numeral from '@elastic/numeral';

export function getFormattedSuccessRatio(successRatio: number) {
  const formatted = numeral(successRatio! * 100).format('0,0');
  return `${formatted}%`;
}

export function getFormattedDuration(value: number) {
  if (!value) {
    return '00:00';
  }
  const duration = moment.duration(value);
  const minutes = Math.floor(duration.asMinutes()).toString().padStart(2, '0');
  const seconds = duration.seconds().toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function getFormattedMilliseconds(value: number) {
  const formatted = numeral(value).format('0,0');
  return `${formatted} ms`;
}
