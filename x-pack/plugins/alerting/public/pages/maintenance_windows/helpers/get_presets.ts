/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { Frequency } from '@kbn/rrule';
import { getInitialByWeekday } from './get_initial_by_weekday';

export const getPresets = (startDate: Moment) => {
  return {
    [Frequency.DAILY]: {
      interval: 1,
    },
    [Frequency.WEEKLY]: {
      interval: 1,
      byweekday: getInitialByWeekday([], startDate),
    },
    [Frequency.MONTHLY]: {
      interval: 1,
      bymonth: 'weekday',
    },
    [Frequency.YEARLY]: {
      interval: 1,
    },
  };
};
