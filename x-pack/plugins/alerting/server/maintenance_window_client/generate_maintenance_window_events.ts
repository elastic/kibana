/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { RRule, Weekday } from 'rrule';
import { parseByWeekday } from '../lib/rrule';
import { RRuleParams } from '../../common';

const utcToLocalUtc = (date: Date, tz: string) => {
  const localTime = moment(date).tz(tz);
  const localTimeInUTC = moment(localTime).tz('UTC', true);
  return localTimeInUTC.utc().toDate();
};

const localUtcToUtc = (date: Date, tz: string) => {
  const localTimeString = moment.utc(date).format('YYYY-MM-DD HH:mm:ss.SSS');
  return moment.tz(localTimeString, tz).utc().toDate();
};

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
  const { dtstart, until, wkst, byweekday, tzid, ...rest } = rRule;

  const startDate = utcToLocalUtc(new Date(dtstart), tzid);
  const endDate = utcToLocalUtc(new Date(expirationDate), tzid);

  const rRuleOptions = {
    ...rest,
    dtstart: startDate,
    until: until ? utcToLocalUtc(new Date(until), tzid) : null,
    wkst: wkst ? Weekday.fromStr(wkst) : null,
    byweekday: byweekday ? parseByWeekday(byweekday) : null,
  };

  try {
    const recurrenceRule = new RRule(rRuleOptions);
    const occurrenceDates = recurrenceRule.between(startDate, endDate, true);

    return occurrenceDates.map((date) => {
      const utcDate = localUtcToUtc(date, tzid);
      return {
        gte: utcDate.toISOString(),
        lte: moment(utcDate).add(duration, 'ms').toISOString(),
      };
    });
  } catch (e) {
    throw new Error(`Failed to process RRule ${rRule}. Error: ${e}`);
  }
};
