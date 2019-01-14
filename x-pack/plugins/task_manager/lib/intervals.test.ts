/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { assertValidInterval, intervalFromNow, minutesFromNow } from './intervals';

describe('taskIntervals', () => {
  describe('assertValidInterval', () => {
    test('it accepts intervals in the form `Nm`', () => {
      expect(() => assertValidInterval(`${_.random(1000)}m`)).not.toThrow();
    });

    test('it rejects intervals are not of the form `Nm`', () => {
      expect(() => assertValidInterval(`5m 2s`)).toThrow(
        /Invalid interval "5m 2s"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => assertValidInterval(`hello`)).toThrow(
        /Invalid interval "hello"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });
  });

  describe('intervalFromNow', () => {
    test('it returns the current date plus n minutes', () => {
      const mins = _.random(1, 100);
      const expected = Date.now() + mins * 60 * 1000;
      const nextRun = intervalFromNow(`${mins}m`)!.getTime();
      expect(Math.abs(nextRun - expected)).toBeLessThan(100);
    });

    test('it rejects intervals are not of the form `Nm`', () => {
      expect(() => intervalFromNow(`5m 2s`)).toThrow(
        /Invalid interval "5m 2s"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => intervalFromNow(`hello`)).toThrow(
        /Invalid interval "hello"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });
  });

  describe('minutesFromNow', () => {
    test('it returns the current date plus a number of minutes', () => {
      const mins = _.random(1, 100);
      const expected = Date.now() + mins * 60 * 1000;
      const nextRun = minutesFromNow(mins).getTime();
      expect(Math.abs(nextRun - expected)).toBeLessThan(100);
    });
  });
});
