/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import moment from 'moment-timezone';
import { RRule, Weekday } from 'rrule';
import { parseByWeekday } from '../lib/rrule';
import { RRuleParams, MaintenanceWindowSOAttributes, DateRange } from '../../common';
import { utcToLocalUtc, localUtcToUtc } from '../lib/snooze';

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
        lte: moment.utc(utcDate).add(duration, 'ms').toISOString(),
      };
    });
  } catch (e) {
    throw new Error(`Failed to process RRule ${rRule}. Error: ${e}`);
  }
};

/**
 * Checks to see if we should regenerate maintenance window events.
 * Don't regenerate old events if the underlying RRule/duration did not change.
 */
export const shouldRegenerateEvents = ({
  maintenanceWindow,
  rRule,
  duration,
}: {
  maintenanceWindow: MaintenanceWindowSOAttributes;
  rRule?: RRuleParams;
  duration?: number;
}): boolean => {
  // If the rRule fails a deep equality check (there is a change), we should regenerate events
  if (rRule && !_.isEqual(rRule, maintenanceWindow.rRule)) {
    return true;
  }
  // If the duration changes, we should regenerate events
  if (typeof duration === 'number' && duration !== maintenanceWindow.duration) {
    return true;
  }
  return false;
};

/**
 * Updates and merges the old events with the new events to preserve old modified events,
 * Unless the maintenance window was archived, then the old events are trimmed.
 */
export const mergeEvents = ({
  oldEvents,
  newEvents,
}: {
  oldEvents: DateRange[];
  newEvents: DateRange[];
}) => {
  // If new events have more entries (expiration date got pushed), we merge the old into the new
  if (newEvents.length > oldEvents.length) {
    return [...oldEvents, ...newEvents.slice(-(newEvents.length - oldEvents.length))];
  }
  // If new events have less entries (maintenance window got archived), we trim the old events
  if (oldEvents.length > newEvents.length) {
    return oldEvents.slice(0, newEvents.length);
  }
  return oldEvents;
};
