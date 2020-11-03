/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { Datatable } from 'src/plugins/expressions/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { dataPluginMock } from '../../../../../src/plugins/data/public/mocks';
import { functionWrapper } from 'src/plugins/expressions/common/expression_functions/specs/tests/utils';
import { getTimeScaleFunction, TimeScaleArgs } from './time_scale';

describe('time_scale', () => {
  let timeScale: (input: Datatable, args: TimeScaleArgs) => Promise<Datatable>;
  let dataMock: jest.Mocked<DataPublicPluginStart>;

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

  beforeEach(() => {
    dataMock = dataPluginMock.createStartContract();
    (dataMock.search.aggs.getDateMetaByDatatableColumn as jest.Mock).mockReturnValue({
      timeZone: 'UTC',
      timeRange: {
        from: '2020-10-05T00:00:00.000Z',
        to: '2020-10-10T00:00:00.000Z',
      },
      interval: '1d',
    });
    (dataMock.query.timefilter.timefilter.calculateBounds as jest.Mock).mockImplementation(
      ({ from, to }) => ({
        min: moment(from),
        max: moment(to),
      })
    );
    timeScale = functionWrapper(getTimeScaleFunction(dataMock));
  });

  it('should apply time scale factor to each row', async () => {
    const result = await timeScale(
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
    const result = await timeScale(
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
    const result = await timeScale(mismatchedTable, {
      ...defaultArgs,
      inputColumnId: 'nonexistent',
    });

    expect(result).toBe(mismatchedTable);
  });

  it('should be able to scale up as well', async () => {
    (dataMock.search.aggs.getDateMetaByDatatableColumn as jest.Mock).mockReturnValue({
      timeZone: 'UTC',
      timeRange: {
        from: '2020-10-05T12:00:00.000Z',
        to: '2020-10-05T16:00:00.000Z',
      },
      interval: '1h',
    });
    const result = await timeScale(
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
    (dataMock.search.aggs.getDateMetaByDatatableColumn as jest.Mock).mockReturnValue({
      timeZone: 'UTC',
      timeRange: {
        from: '2020-10-05T13:00:00.000Z',
        to: '2020-10-05T23:00:00.000Z',
      },
      interval: '3h',
    });
    const result = await timeScale(
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
    (dataMock.search.aggs.getDateMetaByDatatableColumn as jest.Mock).mockReturnValue({
      timeZone: 'UTC',
      timeRange: {
        from: '2020-10-05T12:00:00.000Z',
        to: '2020-10-09T12:00:00.000Z',
      },
      interval: '1d',
    });
    const result = await timeScale(
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
    (dataMock.search.aggs.getDateMetaByDatatableColumn as jest.Mock).mockReturnValue({
      timeZone: 'Europe/Berlin',
      timeRange: {
        from: '2020-10-23T00:00:00.000+02:00',
        to: '2020-10-27T00:00:00.000+01:00',
      },
      interval: '1d',
    });
    const result = await timeScale(
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
    (dataMock.search.aggs.getDateMetaByDatatableColumn as jest.Mock).mockReturnValue({
      timeZone: 'UTC',
      timeRange: {
        from: '2010-01-01T00:00:00.000Z',
        to: '2015-01-01T00:00:00.000Z',
      },
      interval: '1y',
    });
    const result = await timeScale(
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
});
