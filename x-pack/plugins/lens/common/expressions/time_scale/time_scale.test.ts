/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { Datatable } from 'src/plugins/expressions/public';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { TimeRange } from 'src/plugins/data/public';
import { functionWrapper } from 'src/plugins/expressions/common/expression_functions/specs/tests/utils';

// mock the specific inner variable:
// there are intra dependencies in the data plugin we might break trying to mock the whole thing
jest.mock('../../../../../../src/plugins/data/common/query/timefilter/get_time', () => {
  const localMoment = jest.requireActual('moment');
  return {
    calculateBounds: jest.fn(({ from, to }) => ({
      min: localMoment(from),
      max: localMoment(to),
    })),
  };
});

import { getTimeScale } from './time_scale';
import type { TimeScaleArgs } from './types';

describe('time_scale', () => {
  let timeScaleWrapped: (input: Datatable, args: TimeScaleArgs) => Promise<Datatable>;
  const timeScale = getTimeScale(() => 'UTC');

  const emptyTable: Datatable = {
    type: 'datatable',
    columns: [
      {
        id: 'date',
        name: 'date',
        meta: {
          type: 'date',
        },
      },
      {
        id: 'metric',
        name: 'metric',
        meta: {
          type: 'number',
        },
      },
    ],
    rows: [],
  };

  const defaultArgs: TimeScaleArgs = {
    dateColumnId: 'date',
    inputColumnId: 'metric',
    outputColumnId: 'scaledMetric',
    targetUnit: 'h',
  };

  function setDateHistogramMeta(options: {
    timeZone: string;
    timeRange: TimeRange;
    interval: string;
  }) {
    emptyTable.columns[0].meta.source = 'esaggs';
    emptyTable.columns[0].meta.sourceParams = {
      type: 'date_histogram',
      params: {
        used_interval: options.interval,
        used_time_zone: options.timeZone,
      },
      appliedTimeRange: options.timeRange,
    };
  }

  beforeEach(() => {
    setDateHistogramMeta({
      timeZone: 'UTC',
      timeRange: {
        from: '2020-10-05T00:00:00.000Z',
        to: '2020-10-10T00:00:00.000Z',
      },
      interval: '1d',
    });
    timeScaleWrapped = functionWrapper(timeScale);
  });

  it('should apply time scale factor to each row', async () => {
    const result = await timeScaleWrapped(
      {
        ...emptyTable,
        rows: [
          {
            date: moment('2020-10-05T00:00:00.000Z').valueOf(),
            metric: 24,
          },
          {
            date: moment('2020-10-06T00:00:00.000Z').valueOf(),
            metric: 24,
          },
          {
            date: moment('2020-10-07T00:00:00.000Z').valueOf(),
            metric: 24,
          },
          {
            date: moment('2020-10-08T00:00:00.000Z').valueOf(),
            metric: 24,
          },
          {
            date: moment('2020-10-09T00:00:00.000Z').valueOf(),
            metric: 24,
          },
        ],
      },
      {
        ...defaultArgs,
      }
    );

    expect(result.rows.map(({ scaledMetric }) => scaledMetric)).toEqual([1, 1, 1, 1, 1]);
  });

  it('should skip gaps in the data', async () => {
    const result = await timeScaleWrapped(
      {
        ...emptyTable,
        rows: [
          {
            date: moment('2020-10-05T00:00:00.000Z').valueOf(),
            metric: 24,
          },
          {
            date: moment('2020-10-06T00:00:00.000Z').valueOf(),
          },
          {
            date: moment('2020-10-07T00:00:00.000Z').valueOf(),
          },
          {
            date: moment('2020-10-08T00:00:00.000Z').valueOf(),
            metric: 24,
          },
          {
            date: moment('2020-10-09T00:00:00.000Z').valueOf(),
            metric: 24,
          },
        ],
      },
      {
        ...defaultArgs,
      }
    );

    expect(result.rows.map(({ scaledMetric }) => scaledMetric)).toEqual([
      1,
      undefined,
      undefined,
      1,
      1,
    ]);
  });

  it('should return input unchanged if input column does not exist', async () => {
    const mismatchedTable = {
      ...emptyTable,
      rows: [
        {
          date: moment('2020-10-05T00:00:00.000Z').valueOf(),
          metric: 24,
        },
      ],
    };
    const result = await timeScaleWrapped(mismatchedTable, {
      ...defaultArgs,
      inputColumnId: 'nonexistent',
    });

    expect(result).toBe(mismatchedTable);
  });

  it('should be able to scale up as well', async () => {
    setDateHistogramMeta({
      timeZone: 'UTC',
      timeRange: {
        from: '2020-10-05T12:00:00.000Z',
        to: '2020-10-05T16:00:00.000Z',
      },
      interval: '1h',
    });
    const result = await timeScaleWrapped(
      {
        ...emptyTable,
        rows: [
          {
            date: moment('2020-10-05T12:00:00.000Z').valueOf(),
            metric: 1,
          },
          {
            date: moment('2020-10-05T13:00:00.000Z').valueOf(),
            metric: 1,
          },
          {
            date: moment('2020-10-05T14:00:00.000Z').valueOf(),
            metric: 1,
          },
          {
            date: moment('2020-10-05T15:00:00.000Z').valueOf(),
            metric: 1,
          },
        ],
      },
      {
        ...defaultArgs,
        targetUnit: 'd',
      }
    );

    expect(result.rows.map(({ scaledMetric }) => scaledMetric)).toEqual([24, 24, 24, 24]);
  });

  it('can scale starting from unit multiple target intervals', async () => {
    setDateHistogramMeta({
      timeZone: 'UTC',
      timeRange: {
        from: '2020-10-05T13:00:00.000Z',
        to: '2020-10-05T23:00:00.000Z',
      },
      interval: '3h',
    });
    const result = await timeScaleWrapped(
      {
        ...emptyTable,
        rows: [
          {
            // bucket is cut off by one hour because of the time range
            date: moment('2020-10-05T12:00:00.000Z').valueOf(),
            metric: 2,
          },
          {
            date: moment('2020-10-05T15:00:00.000Z').valueOf(),
            metric: 3,
          },
          {
            date: moment('2020-10-05T18:00:00.000Z').valueOf(),
            metric: 3,
          },
          {
            // bucket is cut off by one hour because of the time range
            date: moment('2020-10-05T21:00:00.000Z').valueOf(),
            metric: 2,
          },
        ],
      },
      {
        ...defaultArgs,
        targetUnit: 'h',
      }
    );

    expect(result.rows.map(({ scaledMetric }) => scaledMetric)).toEqual([1, 1, 1, 1]);
  });

  it('take start and end of timerange into account', async () => {
    setDateHistogramMeta({
      timeZone: 'UTC',
      timeRange: {
        from: '2020-10-05T12:00:00.000Z',
        to: '2020-10-09T12:00:00.000Z',
      },
      interval: '1d',
    });
    const result = await timeScaleWrapped(
      {
        ...emptyTable,
        rows: [
          {
            // this is a partial bucket because it starts before the start of the time range
            date: moment('2020-10-05T00:00:00.000Z').valueOf(),
            metric: 12,
          },
          {
            date: moment('2020-10-06T00:00:00.000Z').valueOf(),
            metric: 24,
          },
          {
            date: moment('2020-10-07T00:00:00.000Z').valueOf(),
            metric: 24,
          },
          {
            date: moment('2020-10-08T00:00:00.000Z').valueOf(),
            metric: 24,
          },
          {
            // this is a partial bucket because it ends earlier than the regular interval of 1d
            date: moment('2020-10-09T00:00:00.000Z').valueOf(),
            metric: 12,
          },
        ],
      },
      {
        ...defaultArgs,
      }
    );

    expect(result.rows.map(({ scaledMetric }) => scaledMetric)).toEqual([1, 1, 1, 1, 1]);
  });

  it('should respect DST switches', async () => {
    setDateHistogramMeta({
      timeZone: 'Europe/Berlin',
      timeRange: {
        from: '2020-10-23T00:00:00.000+02:00',
        to: '2020-10-27T00:00:00.000+01:00',
      },
      interval: '1d',
    });
    const result = await timeScaleWrapped(
      {
        ...emptyTable,
        rows: [
          {
            date: moment('2020-10-23T00:00:00.000+02:00').valueOf(),
            metric: 24,
          },
          {
            date: moment('2020-10-24T00:00:00.000+02:00').valueOf(),
            metric: 24,
          },
          {
            // this day has one hour more in Europe/Berlin due to DST switch
            date: moment('2020-10-25T00:00:00.000+02:00').valueOf(),
            metric: 25,
          },
          {
            date: moment('2020-10-26T00:00:00.000+01:00').valueOf(),
            metric: 24,
          },
        ],
      },
      {
        ...defaultArgs,
      }
    );

    expect(result.rows.map(({ scaledMetric }) => scaledMetric)).toEqual([1, 1, 1, 1]);
  });

  it('take leap years into account', async () => {
    setDateHistogramMeta({
      timeZone: 'UTC',
      timeRange: {
        from: '2010-01-01T00:00:00.000Z',
        to: '2015-01-01T00:00:00.000Z',
      },
      interval: '1y',
    });
    const result = await timeScaleWrapped(
      {
        ...emptyTable,
        rows: [
          {
            date: moment('2010-01-01T00:00:00.000Z').valueOf(),
            metric: 365,
          },
          {
            date: moment('2011-01-01T00:00:00.000Z').valueOf(),
            metric: 365,
          },
          {
            // 2012 is a leap year and has an additional day
            date: moment('2012-01-01T00:00:00.000Z').valueOf(),
            metric: 366,
          },
          {
            date: moment('2013-01-01T00:00:00.000Z').valueOf(),
            metric: 365,
          },
          {
            date: moment('2014-01-01T00:00:00.000Z').valueOf(),
            metric: 365,
          },
        ],
      },
      {
        ...defaultArgs,
        targetUnit: 'd',
      }
    );

    expect(result.rows.map(({ scaledMetric }) => scaledMetric)).toEqual([1, 1, 1, 1, 1]);
  });

  it('should be sync except for timezone getter to prevent timezone leakage', async () => {
    let resolveTimezonePromise: (value: string | PromiseLike<string>) => void;
    const timezonePromise = new Promise<string>((res) => {
      resolveTimezonePromise = res;
    });
    const timeScaleResolved = jest.fn((x) => x);
    const delayedTimeScale = getTimeScale(() => timezonePromise);
    const delayedTimeScaleWrapper = functionWrapper(delayedTimeScale);
    const result = delayedTimeScaleWrapper(
      {
        ...emptyTable,
      },
      {
        ...defaultArgs,
      }
    ).then(timeScaleResolved) as Promise<Datatable>;

    expect(result instanceof Promise).toBe(true);
    // wait a tick
    await new Promise((r) => setTimeout(r, 0));
    // time scale is not done yet because it's waiting for the timezone
    expect(timeScaleResolved).not.toHaveBeenCalled();
    // resolve timezone
    resolveTimezonePromise!('UTC');
    // wait a tick
    await new Promise((r) => setTimeout(r, 0));
    // should resolve now without another async dependency
    expect(timeScaleResolved).toHaveBeenCalled();
  });
});
