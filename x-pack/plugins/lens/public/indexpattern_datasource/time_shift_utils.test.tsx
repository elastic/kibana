/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDisallowedPreviousShiftMessage } from './time_shift_utils';
import { IndexPatternLayer } from './types';

describe('time_shift_utils', () => {
  describe('getDisallowedPreviousShiftMessage', () => {
    const layer: IndexPatternLayer = {
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
});
