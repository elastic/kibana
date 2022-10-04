/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeScaleUnit } from '../../../../common/expressions';
import { adjustTimeScaleLabelSuffix } from './time_scale_utils';

export const DEFAULT_TIME_SCALE = 's' as TimeScaleUnit;

describe('time scale utils', () => {
  describe('adjustTimeScaleLabelSuffix', () => {
    it('should should remove existing suffix', () => {
      expect(
        adjustTimeScaleLabelSuffix(
          'abc per second',
          's',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        )
      ).toEqual('abc');
      expect(
        adjustTimeScaleLabelSuffix(
          'abc per hour',
          'h',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        )
      ).toEqual('abc');
      expect(
        adjustTimeScaleLabelSuffix(
          'abc -3d',
          undefined,
          undefined,
          '3d',
          undefined,
          undefined,
          undefined
        )
      ).toEqual('abc');
      expect(
        adjustTimeScaleLabelSuffix(
          'abc per hour -3d',
          'h',
          undefined,
          '3d',
          undefined,
          undefined,
          undefined
        )
      ).toEqual('abc');
      expect(
        adjustTimeScaleLabelSuffix(
          'abc last 5m',
          undefined,
          undefined,
          undefined,
          undefined,
          '5m',
          undefined
        )
      ).toEqual('abc');
      expect(
        adjustTimeScaleLabelSuffix(
          'abc per hour -3d last 5m',
          'h',
          undefined,
          '3d',
          undefined,
          '5m',
          undefined
        )
      ).toEqual('abc');
    });

    it('should add suffix', () => {
      expect(
        adjustTimeScaleLabelSuffix(
          'abc',
          undefined,
          's',
          undefined,
          undefined,
          undefined,
          undefined
        )
      ).toEqual('abc per second');
      expect(
        adjustTimeScaleLabelSuffix(
          'abc',
          undefined,
          'd',
          undefined,
          undefined,
          undefined,
          undefined
        )
      ).toEqual('abc per day');
      expect(
        adjustTimeScaleLabelSuffix(
          'abc',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          '5m'
        )
      ).toEqual('abc last 5m');
      expect(
        adjustTimeScaleLabelSuffix(
          'abc',
          undefined,
          undefined,
          undefined,
          '12h',
          undefined,
          undefined
        )
      ).toEqual('abc -12h');
      expect(
        adjustTimeScaleLabelSuffix('abc', undefined, 'h', undefined, '12h', undefined, undefined)
      ).toEqual('abc per hour -12h');
      expect(
        adjustTimeScaleLabelSuffix('abc', undefined, 'h', undefined, '12h', undefined, '5m')
      ).toEqual('abc per hour -12h last 5m');
    });

    it('should add and remove at the same time', () => {
      expect(
        adjustTimeScaleLabelSuffix(
          'abc per hour',
          'h',
          undefined,
          undefined,
          '1d',
          undefined,
          undefined
        )
      ).toEqual('abc -1d');
      expect(
        adjustTimeScaleLabelSuffix('abc -1d', undefined, 'h', '1d', undefined, undefined, undefined)
      ).toEqual('abc per hour');
      expect(
        adjustTimeScaleLabelSuffix('abc -1d', undefined, 'h', '1d', undefined, undefined, '12m')
      ).toEqual('abc per hour last 12m');
    });

    it('should change suffix', () => {
      expect(
        adjustTimeScaleLabelSuffix(
          'abc per second',
          's',
          'd',
          undefined,
          undefined,
          undefined,
          undefined
        )
      ).toEqual('abc per day');
      expect(
        adjustTimeScaleLabelSuffix(
          'abc per day',
          'd',
          's',
          undefined,
          undefined,
          undefined,
          undefined
        )
      ).toEqual('abc per second');
      expect(
        adjustTimeScaleLabelSuffix('abc per day -3h', 'd', 's', '3h', '3h', undefined, undefined)
      ).toEqual('abc per second -3h');
      expect(
        adjustTimeScaleLabelSuffix('abc per day -3h', 'd', 'd', '3h', '4h', undefined, undefined)
      ).toEqual('abc per day -4h');
    });

    it('should change reduced time range', () => {
      expect(
        adjustTimeScaleLabelSuffix(
          'abc per second last 5m',
          's',
          's',
          undefined,
          undefined,
          undefined,
          '2h'
        )
      ).toEqual('abc per second last 2h');
    });

    it('should keep current state', () => {
      expect(
        adjustTimeScaleLabelSuffix(
          'abc',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        )
      ).toEqual('abc');
      expect(
        adjustTimeScaleLabelSuffix(
          'abc per day',
          'd',
          'd',
          undefined,
          undefined,
          undefined,
          undefined
        )
      ).toEqual('abc per day');
      expect(
        adjustTimeScaleLabelSuffix(
          'abc -1h',
          undefined,
          undefined,
          '1h',
          '1h',
          undefined,
          undefined
        )
      ).toEqual('abc -1h');
      expect(
        adjustTimeScaleLabelSuffix('abc per day -1h', 'd', 'd', '1h', '1h', undefined, undefined)
      ).toEqual('abc per day -1h');
      expect(
        adjustTimeScaleLabelSuffix('abc per day -1h last 78s', 'd', 'd', '1h', '1h', '78s', '78s')
      ).toEqual('abc per day -1h last 78s');
    });

    it('should not fail on inconsistent input', () => {
      expect(
        adjustTimeScaleLabelSuffix(
          'abc',
          's',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        )
      ).toEqual('abc');
      expect(
        adjustTimeScaleLabelSuffix('abc', 's', 'd', undefined, undefined, undefined, undefined)
      ).toEqual('abc per day');
      expect(
        adjustTimeScaleLabelSuffix(
          'abc per day',
          's',
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        )
      ).toEqual('abc per day');
    });
  });
});
