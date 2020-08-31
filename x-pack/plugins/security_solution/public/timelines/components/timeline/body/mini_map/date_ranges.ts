/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

export type MomentUnit = 'year' | 'month' | 'week' | 'day';

export type MomentIncrement = 'quarters' | 'months' | 'weeks' | 'days' | 'hours';

export type MomentUnitToIncrement = { [key in MomentUnit]: MomentIncrement };

const unitsToIncrements: MomentUnitToIncrement = {
  day: 'hours',
  month: 'weeks',
  week: 'days',
  year: 'quarters',
};

interface GetDatesParams {
  unit: MomentUnit;
  end: moment.Moment;
  current: moment.Moment;
}

/**
 * A pure function that given a unit (e.g. `'year' | 'month' | 'week'...`) and
 * a date range, returns a range of `Date`s with a granularity appropriate
 * to the unit.
 *
 * @example
 * test('given a unit of "year", it returns the four quarters of the year', () => {
 *   const unit: MomentUnit = 'year';
 *   const end = moment.utc('Mon, 31 Dec 2018 23:59:59 -0700');
 *   const current = moment.utc('Mon, 01 Jan 2018 00:00:00 -0700');
 *
 *   expect(getDates({ unit, end, current })).toEqual(
 *     [
 *       '2018-01-01T07:00:00.000Z',
 *       '2018-04-01T06:00:00.000Z',
 *       '2018-07-01T06:00:00.000Z',
 *       '2018-10-01T06:00:00.000Z'
 *     ].map(d => new Date(d))
 *   );
 * });
 */
export const getDates = ({ unit, end, current }: GetDatesParams): Date[] =>
  current <= end
    ? [
        current.toDate(),
        ...getDates({
          current: current.clone().add(1, unitsToIncrements[unit]),
          end,
          unit,
        }),
      ]
    : [];

/**
 * An impure function (it performs IO to get the current `Date`) that,
 * given a unit (e.g. `'year' | 'month' | 'week'...`), it
 * returns range of `Date`s with a granularity appropriate to the unit.
 */
export function getDateRange(unit: MomentUnit): Date[] {
  const current = moment().utc().startOf(unit);
  const end = moment().utc().endOf(unit);

  return getDates({
    current,
    end, // TODO: this should be relative to `unit`
    unit,
  });
}
