/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormBasedLayer } from '../../../../..';
import {
  INTERVAL_OP_MISSING_DATE_HISTOGRAM_TO_COMPUTE_INTERVAL,
  INTERVAL_OP_MISSING_TIME_RANGE,
  INTERVAL_OP_MISSING_UI_SETTINGS_HISTOGRAM_BAR_TARGET,
  TIMERANGE_OP_DATAVIEW_NOT_TIME_BASED,
  TIMERANGE_OP_MISSING_TIME_RANGE,
} from '../../../../../user_messages_ids';
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
            {
              uniqueId: INTERVAL_OP_MISSING_DATE_HISTOGRAM_TO_COMPUTE_INTERVAL,
              message: 'Cannot compute an interval without a date histogram column configured',
            },
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
        ).toEqual(
          expect.arrayContaining([
            {
              uniqueId: INTERVAL_OP_MISSING_TIME_RANGE,
              message: 'The current time range interval is not available',
            },
          ])
        );
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
        ).toEqual(
          expect.arrayContaining([
            {
              uniqueId: INTERVAL_OP_MISSING_UI_SETTINGS_HISTOGRAM_BAR_TARGET,
              message: 'Missing "histogram:barTarget" value',
            },
          ])
        );
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
        ).toHaveLength(0);
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
        ).toEqual(
          expect.arrayContaining([
            {
              message: 'The current time range interval is not available',
              uniqueId: TIMERANGE_OP_MISSING_TIME_RANGE,
            },
          ])
        );
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
        ).toEqual(
          expect.arrayContaining([
            {
              message: 'The current dataView is not time based',
              uniqueId: TIMERANGE_OP_DATAVIEW_NOT_TIME_BASED,
            },
          ])
        );
      });
    });
  });
  describe('now', () => {
    describe('getErrorMessages', () => {
      it('should return no error even without context', () => {
        expect(
          nowOperation.getErrorMessage!(createLayer('now'), 'col1', createMockedIndexPattern())
        ).toHaveLength(0);
      });
    });
  });
});
