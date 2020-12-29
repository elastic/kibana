/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { IndexPatternLayer } from '../types';
import type { TimeScaleUnit } from '../time_scale';
import type { IndexPatternColumn } from './definitions';
import { adjustTimeScaleLabelSuffix, adjustTimeScaleOnOtherColumnChange } from './time_scale_utils';

export const DEFAULT_TIME_SCALE = 's' as TimeScaleUnit;

describe('time scale utils', () => {
  describe('adjustTimeScaleLabelSuffix', () => {
    it('should should remove existing suffix', () => {
      expect(adjustTimeScaleLabelSuffix('abc per second', 's', undefined)).toEqual('abc');
      expect(adjustTimeScaleLabelSuffix('abc per hour', 'h', undefined)).toEqual('abc');
    });

    it('should add suffix', () => {
      expect(adjustTimeScaleLabelSuffix('abc', undefined, 's')).toEqual('abc per second');
      expect(adjustTimeScaleLabelSuffix('abc', undefined, 'd')).toEqual('abc per day');
    });

    it('should change suffix', () => {
      expect(adjustTimeScaleLabelSuffix('abc per second', 's', 'd')).toEqual('abc per day');
      expect(adjustTimeScaleLabelSuffix('abc per day', 'd', 's')).toEqual('abc per second');
    });

    it('should keep current state', () => {
      expect(adjustTimeScaleLabelSuffix('abc', undefined, undefined)).toEqual('abc');
      expect(adjustTimeScaleLabelSuffix('abc per day', 'd', 'd')).toEqual('abc per day');
    });

    it('should not fail on inconsistent input', () => {
      expect(adjustTimeScaleLabelSuffix('abc', 's', undefined)).toEqual('abc');
      expect(adjustTimeScaleLabelSuffix('abc', 's', 'd')).toEqual('abc per day');
      expect(adjustTimeScaleLabelSuffix('abc per day', 's', undefined)).toEqual('abc per day');
    });
  });

  describe('adjustTimeScaleOnOtherColumnChange', () => {
    const baseColumn: IndexPatternColumn = {
      operationType: 'count',
      sourceField: 'Records',
      label: 'Count of records per second',
      dataType: 'number',
      isBucketed: false,
      timeScale: 's',
    };
    const baseLayer: IndexPatternLayer = {
      columns: { col1: baseColumn },
      columnOrder: [],
      indexPatternId: '',
    };
    it('should keep column if there is no time scale', () => {
      const column = { ...baseColumn, timeScale: undefined };
      expect(
        adjustTimeScaleOnOtherColumnChange(
          { ...baseLayer, columns: { col1: column } },
          'col1',
          'col2'
        )
      ).toBe(column);
    });

    it('should keep time scale if there is a date histogram', () => {
      expect(
        adjustTimeScaleOnOtherColumnChange(
          {
            ...baseLayer,
            columns: {
              col1: baseColumn,
              col2: {
                operationType: 'date_histogram',
                dataType: 'date',
                isBucketed: true,
                label: '',
                sourceField: 'date',
                params: { interval: 'auto' },
              },
            },
          },
          'col1',
          'col2'
        )
      ).toBe(baseColumn);
    });

    it('should remove time scale if there is no date histogram', () => {
      expect(adjustTimeScaleOnOtherColumnChange(baseLayer, 'col1', 'col2')).toHaveProperty(
        'timeScale',
        undefined
      );
    });

    it('should remove suffix from label', () => {
      expect(
        adjustTimeScaleOnOtherColumnChange(
          { ...baseLayer, columns: { col1: baseColumn } },
          'col1',
          'col2'
        )
      ).toHaveProperty('label', 'Count of records');
    });

    it('should keep custom label', () => {
      const column = { ...baseColumn, label: 'abc', customLabel: true };
      expect(
        adjustTimeScaleOnOtherColumnChange(
          { ...baseLayer, columns: { col1: column } },
          'col1',
          'col2'
        )
      ).toHaveProperty('label', 'abc');
    });
  });
});
