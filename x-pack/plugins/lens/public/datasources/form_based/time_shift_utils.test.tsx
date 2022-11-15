/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getDisallowedPreviousShiftMessage, resolveTimeShift } from './time_shift_utils';
import { FormBasedLayer } from './types';

describe('time_shift_utils', () => {
  describe('getDisallowedPreviousShiftMessage', () => {
    const layer: FormBasedLayer = {
      indexPatternId: '',
      columnOrder: [],
      columns: {
        a: {
          operationType: 'date_histogram',
          dataType: 'date',
          isBucketed: true,
          label: '',
          references: [],
          sourceField: 'timestamp',
        },
        b: {
          operationType: 'count',
          dataType: 'number',
          isBucketed: false,
          label: 'non shifted',
          references: [],
          sourceField: 'records',
        },
        c: {
          operationType: 'count',
          dataType: 'number',
          isBucketed: false,
          label: 'shifted',
          timeShift: '1d',
          references: [],
          sourceField: 'records',
        },
      },
    };

    it('shoud not produce an error for no shift', () => {
      expect(getDisallowedPreviousShiftMessage(layer, 'b')).toBeUndefined();
    });

    it('shoud not produce an error for non-previous shift', () => {
      expect(getDisallowedPreviousShiftMessage(layer, 'c')).toBeUndefined();
    });

    it('shoud produce an error for previous shift with date histogram', () => {
      expect(
        getDisallowedPreviousShiftMessage(
          {
            ...layer,
            columns: { ...layer.columns, c: { ...layer.columns.c, timeShift: 'previous' } },
          },
          'c'
        )
      ).toHaveLength(1);
    });

    it('shoud not produce an error for previous shift without date histogram', () => {
      expect(
        getDisallowedPreviousShiftMessage(
          {
            ...layer,
            columns: {
              ...layer.columns,
              a: { ...layer.columns.a, operationType: 'terms' },
              c: { ...layer.columns.c, timeShift: 'previous' },
            },
          },
          'c'
        )
      ).toBeUndefined();
    });
  });

  describe('resolveTimeShift', () => {
    const dateString = '2022-11-02T00:00:00.000Z';
    // shift by 2 days + 2500 s (to get a shift which is not a multiple of the given interval)
    const shiftedDate = moment(dateString).subtract(175300, 's').toISOString();

    function getDateRange(val = dateString) {
      return {
        fromDate: moment(val).subtract('1', 'd').toISOString(),
        toDate: moment(val).add('1', 'd').toISOString(),
      };
    }

    it('should not change a relative time shift', () => {
      for (const val of ['1d', 'previous']) {
        expect(resolveTimeShift(val, getDateRange(), 100)).toBe(val);
      }
    });

    it('should change absolute values to relative in seconds (rounded) with start anchor', () => {
      expect(resolveTimeShift(`startAt(${shiftedDate})`, getDateRange(), 100))
        // the raw value is 88900s, but that's not a multiple of the range interval
        // so it will be rounded to the next interval multiple, then decremented by 1 interval unit (1800s)
        // in order to include the provided date
        .toBe('90000s');
    });

    it('should change absolute values to relative in seconds (rounded) with end anchor', () => {
      expect(resolveTimeShift(`endAt(${shiftedDate})`, getDateRange(), 100))
        // the raw value is 261700s, but that's not a multiple of the range interval
        // so it will be rounded to the next interval multiple
        .toBe('261000s');
    });

    it('should always include the passed date in the computed interval', () => {
      const dateRange = getDateRange();
      for (const anchor of ['startAt', 'endAt']) {
        const [shift] = resolveTimeShift(`${anchor}(${shiftedDate})`, dateRange, 100)!.split('s');
        expect(
          moment(shiftedDate).isBetween(
            moment(dateRange.fromDate).subtract(Number(shift), 's'),
            moment(dateRange.toDate).subtract(Number(shift), 's')
          )
        );
      }
    });
  });
});
