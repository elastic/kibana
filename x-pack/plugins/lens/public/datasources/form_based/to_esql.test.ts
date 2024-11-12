/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPattern } from '../../types';
import { getESQLForLayer } from './to_esql';
import { createCoreSetupMock } from '@kbn/core-lifecycle-browser-mocks/src/core_setup.mock';
import { DateHistogramIndexPatternColumn } from '../..';

describe('to_esql', () => {
  const { uiSettings } = createCoreSetupMock();

  const layer = {
    indexPatternId: 'myIndexPattern',
    columns: {},
    columnOrder: [],
  };

  const indexPattern = {
    title: 'myIndexPattern',
    timeFieldName: 'order_date',
    getFieldByName: (field: string) => {
      if (field === 'records') return undefined;
      return { name: field };
    },
  } as unknown as IndexPattern;

  it('should produce valid esql for date histogram and count', () => {
    const esql = getESQLForLayer(
      [
        [
          '1',
          {
            operationType: 'date_histogram',
            sourceField: 'order_date',
            label: 'Date histogram',
            dataType: 'date',
            isBucketed: true,
          },
        ],
        [
          '2',
          {
            operationType: 'count',
            sourceField: 'records',
            label: 'Count',
            dataType: 'number',
            isBucketed: false,
          },
        ],
      ],
      layer,
      indexPattern,
      uiSettings,
      {
        fromDate: '2021-01-01T00:00:00.000Z',
        toDate: '2021-01-01T23:59:59.999Z',
      },
      new Date()
    );

    expect(esql?.esql).toEqual(
      'FROM myIndexPattern | WHERE order_date >= ?_tstart AND order_date <= ?_tend | STATS bucket_0_0 = COUNT(*) BY order_date = BUCKET(order_date, 3h) | SORT order_date ASC'
    );
  });

  it('should return undefined if missing row option is set', () => {
    const esql = getESQLForLayer(
      [
        [
          '1',
          {
            operationType: 'date_histogram',
            sourceField: 'order_date',
            label: 'Date histogram',
            dataType: 'date',
            isBucketed: true,
            params: { includeEmptyRows: true },
          } as DateHistogramIndexPatternColumn,
        ],
        [
          '2',
          {
            operationType: 'count',
            sourceField: 'records',
            label: 'Count',
            dataType: 'number',
            isBucketed: false,
          },
        ],
      ],
      layer,
      indexPattern,
      uiSettings,
      {
        fromDate: '2021-01-01T00:00:00.000Z',
        toDate: '2021-01-01T23:59:59.999Z',
      },
      new Date()
    );

    expect(esql?.esql).toEqual(undefined);
  });
});
