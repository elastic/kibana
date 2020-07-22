/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { times } from 'lodash';

import { getDateRangeInfo, DateRangeInfo } from './date_range_info';

// dates to test with, separated by 1m, starting with BaseDate, descending
const BaseDate = Date.parse('2000-01-01T00:00:00Z');
const Dates: string[] = [];

// array of date strings, starting at 2000-01-01T00:00:00Z, decreasing by 1 minute
times(10, (index) => Dates.push(new Date(BaseDate - index * 1000 * 60).toISOString()));

const DEFAULT_WINDOW_MINUTES = 5;

const BaseRangeQuery = {
  window: `${DEFAULT_WINDOW_MINUTES}m`,
};

describe('getRangeInfo', () => {
  it('should return 1 date range when no dateStart or interval specified', async () => {
    const info = getDateRangeInfo({ ...BaseRangeQuery, dateEnd: Dates[0] });
    const rInfo = asReadableDateRangeInfo(info);
    expect(rInfo).toMatchInlineSnapshot(`
      Object {
        "dateStart": "1999-12-31T23:55:00.000Z",
        "dateStop_": "2000-01-01T00:00:00.000Z",
        "ranges": Array [
          Object {
            "f": "1999-12-31T23:55:00.000Z",
            "t": "2000-01-01T00:00:00.000Z",
          },
        ],
      }
    `);
  });

  it('should return 1 date range when no dateStart specified', async () => {
    const info = getDateRangeInfo({ ...BaseRangeQuery, dateEnd: Dates[0], interval: '1000d' });
    const rInfo = asReadableDateRangeInfo(info);
    expect(rInfo).toMatchInlineSnapshot(`
      Object {
        "dateStart": "1999-12-31T23:55:00.000Z",
        "dateStop_": "2000-01-01T00:00:00.000Z",
        "ranges": Array [
          Object {
            "f": "1999-12-31T23:55:00.000Z",
            "t": "2000-01-01T00:00:00.000Z",
          },
        ],
      }
    `);
  });

  it('should return 1 date range when no interval specified', async () => {
    const info = getDateRangeInfo({ ...BaseRangeQuery, dateStart: Dates[1], dateEnd: Dates[0] });
    const rInfo = asReadableDateRangeInfo(info);
    expect(rInfo).toMatchInlineSnapshot(`
      Object {
        "dateStart": "1999-12-31T23:55:00.000Z",
        "dateStop_": "2000-01-01T00:00:00.000Z",
        "ranges": Array [
          Object {
            "f": "1999-12-31T23:55:00.000Z",
            "t": "2000-01-01T00:00:00.000Z",
          },
        ],
      }
    `);
  });

  it('should return 2 date ranges as expected', async () => {
    const info = getDateRangeInfo({
      ...BaseRangeQuery,
      dateStart: Dates[1],
      dateEnd: Dates[0],
      interval: '1m',
    });
    const rInfo = asReadableDateRangeInfo(info);
    expect(rInfo).toMatchInlineSnapshot(`
      Object {
        "dateStart": "1999-12-31T23:54:00.000Z",
        "dateStop_": "2000-01-01T00:00:00.000Z",
        "ranges": Array [
          Object {
            "f": "1999-12-31T23:54:00.000Z",
            "t": "1999-12-31T23:59:00.000Z",
          },
          Object {
            "f": "1999-12-31T23:55:00.000Z",
            "t": "2000-01-01T00:00:00.000Z",
          },
        ],
      }
    `);
  });

  it('should return 3 date ranges as expected', async () => {
    const info = getDateRangeInfo({
      ...BaseRangeQuery,
      dateStart: Dates[2],
      dateEnd: Dates[0],
      interval: '1m',
    });
    const rInfo = asReadableDateRangeInfo(info);
    expect(rInfo).toMatchInlineSnapshot(`
      Object {
        "dateStart": "1999-12-31T23:53:00.000Z",
        "dateStop_": "2000-01-01T00:00:00.000Z",
        "ranges": Array [
          Object {
            "f": "1999-12-31T23:53:00.000Z",
            "t": "1999-12-31T23:58:00.000Z",
          },
          Object {
            "f": "1999-12-31T23:54:00.000Z",
            "t": "1999-12-31T23:59:00.000Z",
          },
          Object {
            "f": "1999-12-31T23:55:00.000Z",
            "t": "2000-01-01T00:00:00.000Z",
          },
        ],
      }
    `);
  });

  it('should handle no dateStart, dateEnd or interval specified', async () => {
    const nowM0 = Date.now();
    const nowM5 = nowM0 - 1000 * 60 * 5;

    const info = getDateRangeInfo(BaseRangeQuery);
    expect(sloppyMilliDiff(nowM5, Date.parse(info.dateStart))).toBeCloseTo(0);
    expect(sloppyMilliDiff(nowM0, Date.parse(info.dateEnd))).toBeCloseTo(0);
    expect(info.dateRanges.length).toEqual(1);
    expect(info.dateRanges[0].from).toEqual(info.dateStart);
    expect(info.dateRanges[0].to).toEqual(info.dateEnd);
  });

  it('should throw an error if passed dateStart > dateEnd', async () => {
    const params = {
      ...BaseRangeQuery,
      dateStart: '2020-01-01T00:00:00.000Z',
      dateEnd: '2000-01-01T00:00:00.000Z',
    };
    expect(() => getDateRangeInfo(params)).toThrowErrorMatchingInlineSnapshot(
      `"[dateStart]: is greater than [dateEnd]"`
    );
  });

  it('should throw an error if passed an unparseable dateStart', async () => {
    const params = {
      ...BaseRangeQuery,
      dateStart: 'woopsie',
    };
    expect(() => getDateRangeInfo(params)).toThrowErrorMatchingInlineSnapshot(
      `"invalid date format for dateStart: \\"woopsie\\""`
    );
  });

  it('should throw an error if passed an unparseable dateEnd', async () => {
    const params = {
      ...BaseRangeQuery,
      dateStart: '2020-01-01T00:00:00.000Z',
      dateEnd: 'woopsie',
    };
    expect(() => getDateRangeInfo(params)).toThrowErrorMatchingInlineSnapshot(
      `"invalid date format for dateEnd: \\"woopsie\\""`
    );
  });

  it('should throw an error if passed an unparseable window', async () => {
    const params = { window: 'woopsie' };
    expect(() => getDateRangeInfo(params)).toThrowErrorMatchingInlineSnapshot(
      `"invalid duration format for window: \\"woopsie\\""`
    );
  });

  it('should throw an error if passed an unparseable interval', async () => {
    const params = {
      ...BaseRangeQuery,
      interval: 'woopsie',
    };
    expect(() => getDateRangeInfo(params)).toThrowErrorMatchingInlineSnapshot(
      `"invalid duration format for interval: \\"woopsie\\""`
    );
  });

  it('should throw an error if too many intervals calculated', async () => {
    const params = {
      ...BaseRangeQuery,
      dateStart: '2000-01-01T00:00:00.000Z',
      dateEnd: '2020-01-01T00:00:00.000Z',
      interval: '1s',
    };
    expect(() => getDateRangeInfo(params)).toThrowErrorMatchingInlineSnapshot(
      `"calculated number of intervals 631152001 is greater than maximum 1000"`
    );
  });
});

// Calculate 1/1000 of the millisecond diff between two millisecond values,
// to be used with jest `toBeCloseTo()`
function sloppyMilliDiff(ms1: number | string, ms2: number | string) {
  const m1 = typeof ms1 === 'number' ? ms1 : Date.parse(ms1);
  const m2 = typeof ms2 === 'number' ? ms2 : Date.parse(ms2);
  return Math.abs(m1 - m2) / 1000;
}

function asReadableDateRangeInfo(info: DateRangeInfo) {
  return {
    dateStart: info.dateStart,
    dateStop_: info.dateEnd,
    ranges: info.dateRanges.map((dateRange) => {
      return {
        f: new Date(dateRange.from).toISOString(),
        t: new Date(dateRange.to).toISOString(),
      };
    }),
  };
}
