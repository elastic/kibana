/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormBasedLayer } from '../../../../..';
import { createMockedIndexPattern } from '../../../mocks';
import { DateHistogramIndexPatternColumn } from '../date_histogram';
import {
  ConstantsIndexPatternColumn,
  nowOperation,
  intervalOperation,
  timeRangeOperation,
} from './context_variables';

function createLayer<T extends ConstantsIndexPatternColumn>(
  type: 'interval' | 'now' | 'time_range'
): FormBasedLayer {
  return {
    indexPatternId: '1',
    columnOrder: ['col1'],
    columns: {
      col1: {
        label: `Constant: ${type}`,
        dataType: 'number',
        operationType: type,
        isBucketed: false,
        scale: 'ratio',
        references: [],
      },
    },
  };
}

function createExpression(type: 'interval' | 'now' | 'time_range', value: number) {
  return [
    {
      type: 'function',
      function: 'mathColumn',
      arguments: {
        id: ['col1'],
        name: [`Constant: ${type}`],
        expression: [String(value)],
      },
    },
  ];
}

describe('context variables', () => {
  describe('interval', () => {
    describe('getErrorMessages', () => {
      it('should return error if no date_histogram is configured', () => {
        expect(
          intervalOperation.getErrorMessage!(
            createLayer('interval'),
            'col1',
            createMockedIndexPattern(),
            { fromDate: new Date().toISOString(), toDate: new Date().toISOString() },
            {},
            100
          )
        ).toEqual(
          expect.arrayContaining([
            'Cannot compute an interval without a date histogram column configured',
          ])
        );
      });

      it('should return error if no dateRange is passed over', () => {
        expect(
          intervalOperation.getErrorMessage!(
            createLayer('interval'),
            'col1',
            createMockedIndexPattern(),
            undefined,
            {},
            100
          )
        ).toEqual(expect.arrayContaining(['The current time range interval is not available']));
      });

      it('should return error if no targetBar is passed over', () => {
        expect(
          intervalOperation.getErrorMessage!(
            createLayer('interval'),
            'col1',
            createMockedIndexPattern(),
            { fromDate: new Date().toISOString(), toDate: new Date().toISOString() },
            {}
          )
        ).toEqual(expect.arrayContaining(['Missing "histogram:barTarget" value']));
      });

      it('should not return errors if all context is provided', () => {
        const layer = createLayer('interval');
        layer.columns = {
          col2: {
            label: 'Date histogram',
            dataType: 'date',
            operationType: 'date_histogram',
            sourceField: '@timestamp',
            isBucketed: true,
            scale: 'interval',
            params: {
              interval: 'auto',
              includeEmptyRows: true,
              dropPartials: false,
            },
          } as DateHistogramIndexPatternColumn,
          ...layer.columns,
        };
        layer.columnOrder = ['col2', 'col1'];
        expect(
          intervalOperation.getErrorMessage!(
            layer,
            'col1',
            createMockedIndexPattern(),
            { fromDate: new Date().toISOString(), toDate: new Date().toISOString() },
            {},
            100
          )
        ).toBeUndefined();
      });
    });
    describe('toExpression', () => {
      it('should return 0 if no dateRange is passed', () => {
        expect(
          intervalOperation.toExpression(
            createLayer('interval'),
            'col1',
            createMockedIndexPattern(),
            { now: new Date(), targetBars: 100 }
          )
        ).toEqual(expect.arrayContaining(createExpression('interval', 0)));
      });

      it('should return 0 if no targetBars is passed', () => {
        expect(
          intervalOperation.toExpression(
            createLayer('interval'),
            'col1',
            createMockedIndexPattern(),
            {
              dateRange: {
                fromDate: new Date(2022, 0, 1).toISOString(),
                toDate: new Date(2023, 0, 1).toISOString(),
              },
              now: new Date(),
            }
          )
        ).toEqual(expect.arrayContaining(createExpression('interval', 0)));
      });

      it('should return a valid value > 0 if both dateRange and targetBars is passed', () => {
        expect(
          intervalOperation.toExpression(
            createLayer('interval'),
            'col1',
            createMockedIndexPattern(),
            {
              dateRange: {
                fromDate: new Date(2022, 0, 1).toISOString(),
                toDate: new Date(2023, 0, 1).toISOString(),
              },
              now: new Date(),
              targetBars: 100,
            }
          )
        ).toEqual(expect.arrayContaining(createExpression('interval', 86400000)));
      });
    });
  });
  describe('time_range', () => {
    describe('getErrorMessages', () => {
      it('should return error if no dateRange is passed over', () => {
        expect(
          timeRangeOperation.getErrorMessage!(
            createLayer('time_range'),
            'col1',
            createMockedIndexPattern(),
            undefined,
            {},
            100
          )
        ).toEqual(expect.arrayContaining(['The current time range interval is not available']));
      });

      it('should return error if dataView is not time-based', () => {
        const dataView = createMockedIndexPattern();
        dataView.timeFieldName = undefined;
        expect(
          timeRangeOperation.getErrorMessage!(
            createLayer('time_range'),
            'col1',
            dataView,
            undefined,
            {},
            100
          )
        ).toEqual(expect.arrayContaining(['The current time range interval is not available']));
      });
    });

    describe('toExpression', () => {
      it('should return 0 if no dateRange is passed', () => {
        expect(
          timeRangeOperation.toExpression(
            createLayer('time_range'),
            'col1',
            createMockedIndexPattern(),
            { now: new Date(), targetBars: 100 }
          )
        ).toEqual(expect.arrayContaining(createExpression('time_range', 0)));
      });

      it('should return a valid value > 0 if dateRange is passed', () => {
        expect(
          timeRangeOperation.toExpression(
            createLayer('time_range'),
            'col1',
            createMockedIndexPattern(),
            {
              dateRange: {
                fromDate: new Date(2022, 0, 1).toISOString(),
                toDate: new Date(2023, 0, 1).toISOString(),
              },
            }
          )
        ).toEqual(expect.arrayContaining(createExpression('time_range', 31536000000)));
      });
    });
  });
  describe('now', () => {
    describe('getErrorMessages', () => {
      it('should return no error even without context', () => {
        expect(
          nowOperation.getErrorMessage!(createLayer('now'), 'col1', createMockedIndexPattern())
        ).toBeUndefined();
      });
    });

    describe('toExpression', () => {
      it('should return the now value when passed', () => {
        const now = new Date();
        expect(
          nowOperation.toExpression(createLayer('now'), 'col1', createMockedIndexPattern(), {
            now,
          })
        ).toEqual(expect.arrayContaining(createExpression('now', +now)));
      });
    });
  });
});
