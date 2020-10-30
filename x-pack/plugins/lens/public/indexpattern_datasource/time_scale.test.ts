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
    (dataMock.query.timefilter.timefilter.calculateBounds as jest.Mock).mockReturnValue({
      min: moment('2020-10-05T00:00:00.000Z'),
      max: moment('2020-10-10T00:00:00.000Z'),
    });
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
});
