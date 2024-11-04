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
      expect(asAbsoluteDateTime(1559390400000, 'minutes')).toBe('Jun 1, 2019, 14:00 (UTC+2)');
    });

    it('should add a leading minus for timezones with negative UTC offset', () => {
      moment.tz.setDefault('America/Los_Angeles');
      expect(asAbsoluteDateTime(1559390400000, 'minutes')).toBe('Jun 1, 2019, 05:00 (UTC-7)');
    });

    it('should use default UTC offset formatting when offset contains minutes', () => {
      moment.tz.setDefault('Canada/Newfoundland');
      expect(asAbsoluteDateTime(1559390400000, 'minutes')).toBe('Jun 1, 2019, 09:30 (UTC-02:30)');
    });

    it('should respect DST', () => {
      moment.tz.setDefault('Europe/Copenhagen');
      const timeWithDST = 1559390400000; //  Jun 1, 2019
      const timeWithoutDST = 1575201600000; //  Dec 1, 2019

      expect(asAbsoluteDateTime(timeWithDST)).toBe('Jun 1, 2019, 14:00:00.000 (UTC+2)');

      expect(asAbsoluteDateTime(timeWithoutDST)).toBe('Dec 1, 2019, 13:00:00.000 (UTC+1)');
    });
  });
});
