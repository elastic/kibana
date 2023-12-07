/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionContextSearch } from '@kbn/data-plugin/public';
import { ExecutionContext } from '@kbn/expressions-plugin/common';
import { Adapters } from '@kbn/inspector-plugin/common';
import type { FormBasedLayer } from '../../../../..';
import { createMockedIndexPattern } from '../../../mocks';
import { DateHistogramIndexPatternColumn } from '../date_histogram';
import {
  ConstantsIndexPatternColumn,
  nowOperation,
  intervalOperation,
  timeRangeOperation,
  formulaIntervalFn,
  formulaTimeRangeFn,
  formulaNowFn,
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
    describe('expression function', () => {
      it('should return 0 if no time range available', () => {
        // (not sure if this case is actually possible)
        const result = formulaIntervalFn.fn(undefined, { targetBars: 100 }, {
          getSearchContext: () => ({
            /* no time range */
          }),
        } as ExecutionContext<Adapters, ExecutionContextSearch>);
        expect(result).toEqual(0);
      });

      it('should return 0 if no targetBars is passed', () => {
        const result = formulaIntervalFn.fn(
          undefined,
          {
            /* no targetBars */
          },
          {
            getSearchContext: () => ({
              timeRange: {
                from: 'now-15m',
                to: 'now',
              },
            }),
          } as ExecutionContext<Adapters, ExecutionContextSearch>
        );
        expect(result).toEqual(0);
      });

      it('should return a valid value > 0 if both timeRange and targetBars is passed', () => {
        const result = formulaIntervalFn.fn(undefined, { targetBars: 100 }, {
          getSearchContext: () => ({
            timeRange: {
              from: 'now-15m',
              to: 'now',
            },
          }),
        } as ExecutionContext<Adapters, ExecutionContextSearch>);
        expect(result).toEqual(10000);
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

    describe('expression function', () => {
      it('should return 0 if no time range is available', () => {
        // (not sure if this case is actually possible)
        const result = formulaTimeRangeFn.fn(undefined, {}, {
          getSearchContext: () => ({
            /* no time range */
          }),
        } as ExecutionContext<Adapters, ExecutionContextSearch>);
        expect(result).toEqual(0);
      });

      it('should return a valid value > 0 if time range is available', () => {
        const result = formulaTimeRangeFn.fn(undefined, {}, {
          getSearchContext: () => ({
            timeRange: {
              from: 'now-15m',
              to: 'now',
            },
            now: 1000000, // important to provide this to make the result consistent
          }),
        } as ExecutionContext<Adapters, ExecutionContextSearch>);

        expect(result).toBe(900000);
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

    describe('expression function', () => {
      it('should return the now value when passed', () => {
        const now = 123456789;
        expect(
          formulaNowFn.fn(undefined, {}, {
            getSearchContext: () => ({
              now,
            }),
          } as ExecutionContext<Adapters, ExecutionContextSearch>)
        ).toEqual(now);
      });
    });
  });
});
