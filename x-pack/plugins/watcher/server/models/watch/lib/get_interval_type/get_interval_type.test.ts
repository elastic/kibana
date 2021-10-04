/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIntervalType } from './get_interval_type';

describe('get interval type', () => {
  test('should detect fixed intervals', () => {
    ['1ms', '1s', '1m', '1h', '1d'].forEach((interval) => {
      try {
        expect(getIntervalType(interval)).toBe('fixed');
      } catch (e) {
        throw new Error(`Expected [${interval}] to be a fixed interval`);
      }
    });
  });

  test('should detect calendar intervals', () => {
    ['1w', '1M', '1q', '1y'].forEach((interval) => {
      try {
        expect(getIntervalType(interval)).toBe('calendar');
      } catch (e) {
        throw new Error(`Expected [${interval}] to be a calendar interval`);
      }
    });
  });
});
