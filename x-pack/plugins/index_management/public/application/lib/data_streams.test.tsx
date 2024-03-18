/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getLifecycleValue } from './data_streams';

describe('Data stream helpers', () => {
  describe('getLifecycleValue', () => {
    it('Knows when it should be marked as disabled', () => {
      expect(
        getLifecycleValue({
          enabled: false,
        })
      ).toBe('Disabled');

      expect(getLifecycleValue()).toBe('Disabled');
    });

    it('knows when it should be marked as infinite', () => {
      expect(
        getLifecycleValue({
          enabled: true,
        })
      ).toBe('Keep data indefinitely');
    });

    it('knows when it has a defined data retention period', () => {
      expect(
        getLifecycleValue({
          enabled: true,
          data_retention: '2d',
        })
      ).toBe('2 days');
    });
  });
});
