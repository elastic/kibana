/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { getRelativeTimeDifference } from './date';

describe('date', () => {
  describe('getRelativeTimeDifference', () => {
    const initialTime = new Date('6/1/2020');
    const momentDate = moment(initialTime);
    const fiveSeconds = momentDate.add(5, 's').toDate();
    const fiveMinutes = momentDate.add(5, 'm').toDate();
    const fiveHours = momentDate.add(5, 'h').toDate();
    const fiveDays = momentDate.add(5, 'd').toDate();
    const threeWeeks = momentDate.add(3, 'w').toDate();
    const threeMonths = momentDate.add(3, 'M').toDate();
    const threeYears = momentDate.add(3, 'y').toDate();

    it('should return the correct relative time', () => {
      expect(getRelativeTimeDifference(initialTime, fiveSeconds)).toBe('5 seconds');
      expect(getRelativeTimeDifference(initialTime, fiveMinutes)).toBe('5 minutes');
      expect(getRelativeTimeDifference(initialTime, fiveHours)).toBe('5 hours');
      expect(getRelativeTimeDifference(initialTime, fiveDays)).toBe('5 days');
      expect(getRelativeTimeDifference(initialTime, threeWeeks)).toBe('3 weeks');
      expect(getRelativeTimeDifference(initialTime, threeMonths)).toBe('4 months');
      expect(getRelativeTimeDifference(initialTime, threeYears)).toBe('3 years');
    });
  });
});
