/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeScaleUnit } from '../time_scale';
import { IndexPatternColumn } from './definitions';
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
    it('should keep column if there is no time scale', () => {
      const column = { ...baseColumn, timeScale: undefined };
      expect(adjustTimeScaleOnOtherColumnChange(column, { col1: column })).toBe(column);
    });

    it('should keep time scale if there is a date histogram', () => {
      expect(
        adjustTimeScaleOnOtherColumnChange(baseColumn, {
          col1: baseColumn,
          col2: {
            operationType: 'date_histogram',
            dataType: 'date',
            isBucketed: true,
            label: '',
          },
        })
      ).toBe(baseColumn);
    });

    it('should remove time scale if there is no date histogram', () => {
      expect(adjustTimeScaleOnOtherColumnChange(baseColumn, { col1: baseColumn })).toHaveProperty(
        'timeScale',
        undefined
      );
    });

    it('should remove suffix from label', () => {
      expect(adjustTimeScaleOnOtherColumnChange(baseColumn, { col1: baseColumn })).toHaveProperty(
        'label',
        'Count of records'
      );
    });

    it('should keep custom label', () => {
      const column = { ...baseColumn, label: 'abc', customLabel: true };
      expect(adjustTimeScaleOnOtherColumnChange(column, { col1: column })).toHaveProperty(
        'label',
        'abc'
      );
    });
  });
});
