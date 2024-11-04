/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { asAbsoluteDateTime } from './datetime';

describe('date time formatters', () => {
  beforeAll(() => {
    moment.tz.setDefault('America/Toronto');
  });

  afterAll(() => moment.tz.setDefault(''));

  describe('asAbsoluteDateTime', () => {
    afterAll(() => moment.tz.setDefault(''));

    it('should add a leading plus for timezones with positive UTC offset', () => {
      moment.tz.setDefault('Europe/Copenhagen');
      expect(asAbsoluteDateTime(1728000000000, 'minutes')).toBe('Oct 5, 2024, 14:00 (UTC+2)');
    });

    it('should add a leading minus for timezones with negative UTC offset', () => {
      moment.tz.setDefault('America/Los_Angeles');
      expect(asAbsoluteDateTime(1728000000000, 'minutes')).toBe('Oct 5, 2024, 05:00 (UTC-7)');
    });

    it('should use default UTC offset formatting when offset contains minutes', () => {
      moment.tz.setDefault('Canada/Newfoundland');
      expect(asAbsoluteDateTime(1728000000000, 'minutes')).toBe('Oct 5, 2024, 09:30 (UTC-02:30)');
    });

    it('should respect DST', () => {
      moment.tz.setDefault('Europe/Copenhagen');
      const timeWithDST = 1728000000000; // Oct 5, 2024
      const timeWithoutDST = 1733030400000; // Oct 31, 2024

      expect(asAbsoluteDateTime(timeWithDST)).toBe('Oct 5, 2024, 14:00:00.000 (UTC+2)');
      expect(asAbsoluteDateTime(timeWithoutDST)).toBe('Oct 31, 2024, 14:00:00.000 (UTC+1)');
    });
  });
});
