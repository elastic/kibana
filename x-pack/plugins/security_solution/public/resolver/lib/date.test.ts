/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getFriendlyElapsedTime } from './date';

describe('date', () => {
  describe('getFriendlyElapsedTime', () => {
    const second = 1000;
    const minute = second * 60;
    const hour = minute * 60;
    const day = hour * 24;
    const week = day * 7;
    const month = day * 30;
    const year = day * 365;

    const initialTime = new Date('6/1/2020').getTime();

    const oneSecond = new Date(initialTime + 1 * second).getTime();
    const oneMinute = new Date(initialTime + 1 * minute).getTime();
    const oneHour = new Date(initialTime + 1 * hour).getTime();
    const oneDay = new Date(initialTime + 1 * day).getTime();
    const oneWeek = new Date(initialTime + 1 * week).getTime();
    const oneMonth = new Date(initialTime + 1 * month).getTime();
    const oneYear = new Date(initialTime + 1 * year).getTime();

    const almostAMinute = new Date(initialTime + 59.9 * second).getTime();
    const almostAnHour = new Date(initialTime + 59.9 * minute).getTime();
    const almostADay = new Date(initialTime + 23.9 * hour).getTime();
    const almostAWeek = new Date(initialTime + 6.9 * day).getTime();
    const almostAMonth = new Date(initialTime + 3.9 * week).getTime();
    const almostAYear = new Date(initialTime + 11.9 * month).getTime();
    const threeYears = new Date(initialTime + 3 * year).getTime();

    it('should return the correct singular relative time', () => {
      expect(getFriendlyElapsedTime(initialTime, oneSecond)).toEqual({
        duration: 1,
        durationType: 'second',
      });
      expect(getFriendlyElapsedTime(initialTime, oneMinute)).toEqual({
        duration: 1,
        durationType: 'minute',
      });
      expect(getFriendlyElapsedTime(initialTime, oneHour)).toEqual({
        duration: 1,
        durationType: 'hour',
      });
      expect(getFriendlyElapsedTime(initialTime, oneDay)).toEqual({
        duration: 1,
        durationType: 'day',
      });
      expect(getFriendlyElapsedTime(initialTime, oneWeek)).toEqual({
        duration: 1,
        durationType: 'week',
      });
      expect(getFriendlyElapsedTime(initialTime, oneMonth)).toEqual({
        duration: 1,
        durationType: 'month',
      });
      expect(getFriendlyElapsedTime(initialTime, oneYear)).toEqual({
        duration: 1,
        durationType: 'year',
      });
    });

    it('should return the correct pluralized relative time', () => {
      expect(getFriendlyElapsedTime(initialTime, almostAMinute)).toEqual({
        duration: 59,
        durationType: 'seconds',
      });
      expect(getFriendlyElapsedTime(initialTime, almostAnHour)).toEqual({
        duration: 59,
        durationType: 'minutes',
      });
      expect(getFriendlyElapsedTime(initialTime, almostADay)).toEqual({
        duration: 23,
        durationType: 'hours',
      });
      expect(getFriendlyElapsedTime(initialTime, almostAWeek)).toEqual({
        duration: 6,
        durationType: 'days',
      });
      expect(getFriendlyElapsedTime(initialTime, almostAMonth)).toEqual({
        duration: 3,
        durationType: 'weeks',
      });
      expect(getFriendlyElapsedTime(initialTime, almostAYear)).toEqual({
        duration: 11,
        durationType: 'months',
      });
      expect(getFriendlyElapsedTime(initialTime, threeYears)).toEqual({
        duration: 3,
        durationType: 'years',
      });
    });
  });
});
