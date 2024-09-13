/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { ISO_WEEKDAYS } from '../../../../common';
import { ISO_WEEKDAYS_TO_RRULE } from '../constants';

export const getInitialByWeekday = (initialStateByweekday: string[], date: Moment | null) => {
  const dayOfWeek = date ? date.isoWeekday() : 1;
  return ISO_WEEKDAYS.reduce((result, n) => {
    result[n] =
      initialStateByweekday?.length > 0
        ? initialStateByweekday
            // Sanitize nth day strings, e.g. +2MO, -1FR, into just days of the week
            .map((w) => w.replace(/[0-9+\-]/g, ''))
            .includes(ISO_WEEKDAYS_TO_RRULE[n])
        : n === dayOfWeek;
    return result;
  }, {} as Record<string, boolean>);
};
