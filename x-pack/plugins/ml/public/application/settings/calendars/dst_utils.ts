/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Moment } from 'moment-timezone';
import moment from 'moment-timezone';

import type { MlCalendar, MlCalendarEvent } from '../../../../common/types/calendars';
import { generateTempId } from './edit/utils';

function addZeroPadding(num: number) {
  return num < 10 ? `0${num}` : num;
}

const DST_CHANGE_DESCRIPTIONS = {
  WINTER: i18n.translate('xpack.ml.calendarsEdit.dstChangeDescriptionWinter', {
    defaultMessage: 'Winter',
  }),
  SUMMER: i18n.translate('xpack.ml.calendarsEdit.dstChangeDescriptionSummer', {
    defaultMessage: 'Summer',
  }),
} as const;

function createDstEvent(time: Moment, year: number, shiftSecs: number) {
  return {
    event_id: generateTempId(),
    description: `${
      shiftSecs > 0 ? DST_CHANGE_DESCRIPTIONS.SUMMER : DST_CHANGE_DESCRIPTIONS.WINTER
    } ${year}`,
    start_time: time.valueOf(),
    end_time: time.add(2, 'days').valueOf(),
    skip_result: false,
    skip_model_update: false,
    force_time_shift: shiftSecs,
  };
}

function getDSTChangeDates(timezone: string, year: number) {
  let start: Moment | null = null;
  let end: Moment | null = null;

  // debugDST(timezone, year);

  for (let month = 1; month < 13; month++) {
    for (let day = 1; day <= 31; day++) {
      const date = moment.tz(
        `${year}-${addZeroPadding(month)}-${addZeroPadding(day)} 09:00:00`,
        timezone
      );
      if (date.isValid() === false) {
        continue;
      }

      if (!start && date.isDST()) {
        // loop over hours
        for (let hour = 0; hour < 24; hour++) {
          const date2 = moment.tz(
            `${year}-${addZeroPadding(month)}-${addZeroPadding(day)} ${addZeroPadding(hour)}:00:00`,
            timezone
          );
          if (date2.isDST() === true) {
            start = date2;
            break;
          }
        }
        // start = date;
      }

      if (start && !end && date.isDST() === false) {
        // loop over hours
        for (let hour = 0; hour < 24; hour++) {
          const date2 = moment.tz(
            `${year}-${addZeroPadding(month)}-${addZeroPadding(day)} ${addZeroPadding(hour)}:00:00`,
            timezone
          );
          if (date2.isDST() === false) {
            end = date2;
            break;
          }
        }
      }
    }
  }

  return { start, end, year };
}

export function generateDSTChangeDates(
  timezone: string,
  years: number
): {
  dates: Array<{ start: Moment | null; end: Moment | null; year: number }>;
  shiftSecs: number;
} {
  const thisYear = new Date().getFullYear();
  const endYear = thisYear + years;
  const dates = [];
  for (let year = thisYear; year < endYear; year++) {
    const dstChanges = getDSTChangeDates(timezone, year);
    dates.push(dstChanges);
  }
  const janDate = moment.tz(`${thisYear}-01-10 09:00:00`, timezone);
  const juneDate = moment.tz(`${thisYear}-06-10 09:00:00`, timezone);
  const diffMins = juneDate.utcOffset() - janDate.utcOffset();
  const shiftSecs = diffMins * 60;
  return { dates, shiftSecs };
}

const YEARS_OF_DST_EVENTS = 20;

export function createDstEvents(timezone: string) {
  const { dates, shiftSecs } = generateDSTChangeDates(timezone, YEARS_OF_DST_EVENTS);
  return dates.reduce<MlCalendarEvent[]>((acc, date) => {
    if (!date.start || !date.end) {
      return acc;
    }
    acc.push(createDstEvent(date.start, date.year, shiftSecs));
    acc.push(createDstEvent(date.end, date.year, -shiftSecs));

    return acc;
  }, []);
}

export const isDstCalendar = (calendar: MlCalendar) => {
  return calendar.events.some((event) => {
    return event.force_time_shift !== undefined;
  });
};
