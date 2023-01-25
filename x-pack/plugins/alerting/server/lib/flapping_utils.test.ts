/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesSettingsFlapping, DEFAULT_FLAPPING_SETTINGS } from '../../common/rules_settings';
import { atCapacity, updateFlappingHistory, isFlapping } from './flapping_utils';

describe('flapping utils', () => {
  const flappingSettings = DEFAULT_FLAPPING_SETTINGS as RulesSettingsFlapping;

  describe('updateFlappingHistory function', () => {
    test('correctly updates flappingHistory', () => {
      const flappingHistory = updateFlappingHistory(flappingSettings, [false, false], true);
      expect(flappingHistory).toEqual([false, false, true]);
    });

    test('correctly updates flappingHistory while maintaining a fixed size', () => {
      const flappingHistory = new Array(20).fill(false);
      const fh = updateFlappingHistory(flappingSettings, flappingHistory, true);
      expect(fh.length).toEqual(20);
      const result = new Array(19).fill(false);
      expect(fh).toEqual(result.concat(true));
    });

    test('correctly updates flappingHistory while maintaining if array is larger than fixed size', () => {
      const flappingHistory = new Array(23).fill(false);
      const fh = updateFlappingHistory(flappingSettings, flappingHistory, true);
      expect(fh.length).toEqual(20);
      const result = new Array(19).fill(false);
      expect(fh).toEqual(result.concat(true));
    });

    test('does not update flappingHistory if flapping is disabled', () => {
      const flappingHistory = updateFlappingHistory(
        { ...flappingSettings, enabled: false },
        [false, false],
        true
      );
      expect(flappingHistory).toEqual([false, false]);
    });
  });

  describe('atCapacity and getCapacityDiff functions', () => {
    test('returns true if flappingHistory == set capacity', () => {
      const flappingHistory = new Array(20).fill(false);
      expect(atCapacity(flappingSettings, flappingHistory)).toEqual(true);
    });

    test('returns true if flappingHistory > set capacity', () => {
      const flappingHistory = new Array(25).fill(false);
      expect(atCapacity(flappingSettings, flappingHistory)).toEqual(true);
    });

    test('returns false if flappingHistory < set capacity', () => {
      const flappingHistory = new Array(15).fill(false);
      expect(atCapacity(flappingSettings, flappingHistory)).toEqual(false);
    });
  });

  describe('isFlapping', () => {
    describe('not currently flapping', () => {
      test('returns true if at capacity and flap count exceeds the threshold', () => {
        const flappingHistory = [true, true, true, true].concat(new Array(16).fill(false));
        expect(isFlapping(flappingSettings, flappingHistory)).toEqual(true);
      });

      test("returns false if at capacity and flap count doesn't exceed the threshold", () => {
        const flappingHistory = [true, true].concat(new Array(20).fill(false));
        expect(isFlapping(flappingSettings, flappingHistory)).toEqual(false);
      });

      test('returns true if not at capacity', () => {
        const flappingHistory = new Array(5).fill(true);
        expect(isFlapping(flappingSettings, flappingHistory)).toEqual(true);
      });
    });

    describe('currently flapping', () => {
      test('returns true if at capacity and the flap count exceeds the threshold', () => {
        const flappingHistory = new Array(16).fill(false).concat([true, true, true, true]);
        expect(isFlapping(flappingSettings, flappingHistory, true)).toEqual(true);
      });

      test("returns true if not at capacity and the flap count doesn't exceed the threshold", () => {
        const flappingHistory = new Array(16).fill(false);
        expect(isFlapping(flappingSettings, flappingHistory, true)).toEqual(true);
      });

      test('returns true if not at capacity and the flap count exceeds the threshold', () => {
        const flappingHistory = new Array(10).fill(false).concat([true, true, true, true]);
        expect(isFlapping(flappingSettings, flappingHistory, true)).toEqual(true);
      });

      test("returns false if at capacity and the flap count doesn't exceed the threshold", () => {
        const flappingHistory = new Array(20).fill(false);
        expect(isFlapping(flappingSettings, flappingHistory, true)).toEqual(false);
      });
    });

    describe('flapping disabled', () => {
      test('returns false if flapping is disabled', () => {
        const flappingHistory = new Array(16).fill(false).concat([true, true, true, true]);
        expect(isFlapping({ ...flappingSettings, enabled: false }, flappingHistory, true)).toEqual(
          false
        );
      });
    });
  });
});
