/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { RRule, Weekday } from 'rrule';
import { parseByWeekday } from '../lib/rrule';
import { RRuleParams } from '../../common';

export interface GenerateMaintenanceWindowEventsParams {
  rRule: RRuleParams;
  expirationDate: string;
  duration: number;
}

export const generateMaintenanceWindowEvents = ({
  rRule,
  expirationDate,
  duration,
}: GenerateMaintenanceWindowEventsParams) => {
  const { dtstart, until, wkst, byweekday } = rRule;
  const rRuleOptions = {
    ...rRule,
    dtstart: new Date(dtstart),
    until: until ? new Date(until) : null,
    wkst: wkst ? Weekday.fromStr(wkst) : null,
    byweekday: byweekday ? parseByWeekday(byweekday) : null,
  };

  try {
    const startDate = new Date(dtstart);
    const endDate = new Date(expirationDate);
    const recurrenceRule = new RRule(rRuleOptions);
    const occurrenceDates = recurrenceRule.between(startDate, endDate, true);

    return occurrenceDates.map((date) => ({
      gte: date.toISOString(),
      lte: moment(date).add(duration, 'ms').toISOString(),
    }));
  } catch (e) {
    throw new Error(`Failed to process RRule ${rRule}. Error: ${e}`);
  }
};
