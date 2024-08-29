/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { calculateAuto } from './calculate_auto';

const numBuckets = 8;

describe('calculateAuto', () => {
  describe('when using near', () => {
    const end = moment();
    it('returns 30 day interval for a 4 year duration', () => {
      const start = moment().subtract(4, 'years');
      expect(
        calculateAuto.near(numBuckets, moment.duration(end.diff(start)))?.asMilliseconds()
      ).toEqual(2592000000);
    });
    it('returns 30 day interval for a 1 year duration', () => {
      const start = moment().subtract(1, 'years');
      expect(
        calculateAuto.near(numBuckets, moment.duration(end.diff(start)))?.asMilliseconds()
      ).toEqual(2592000000);
    });
    it('returns 7 day interval for a 5 month duration', () => {
      const start = moment().subtract(5, 'months');
      expect(
        calculateAuto.near(numBuckets, moment.duration(end.diff(start)))?.asMilliseconds()
      ).toEqual(604800000);
    });
    it('returns 7 day interval for a 3 month duration', () => {
      const start = moment().subtract(3, 'months');
      expect(
        calculateAuto.near(numBuckets, moment.duration(end.diff(start)))?.asMilliseconds()
      ).toEqual(604800000);
    });
    it('returns 7 day interval for a 2 month duration', () => {
      const start = moment().subtract(2, 'months');
      expect(
        calculateAuto.near(numBuckets, moment.duration(end.diff(start)))?.asMilliseconds()
      ).toEqual(604800000);
    });
    it('returns 5 minute interval for a 1 hour duration', () => {
      const start = moment().subtract(1, 'hour');
      expect(
        calculateAuto.near(numBuckets, moment.duration(end.diff(start)))?.asMilliseconds()
      ).toEqual(300000);
    });
    it('returns 1 minute interval for a 15 minute duration', () => {
      const start = moment().subtract(15, 'minutes');
      expect(
        calculateAuto.near(numBuckets, moment.duration(end.diff(start)))?.asMilliseconds()
      ).toEqual(60000);
    });
    it('returns 5 second interval for a 1 minute duration', () => {
      const start = moment().subtract(1, 'minutes');
      expect(
        calculateAuto.near(numBuckets, moment.duration(end.diff(start)))?.asMilliseconds()
      ).toEqual(5000);
    });
  });
});
