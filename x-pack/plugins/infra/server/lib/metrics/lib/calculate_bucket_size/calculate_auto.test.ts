/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateAuto, roundingRules } from './calculate_auto';
import moment, { Duration, isDuration } from 'moment';

describe('calculateAuto', () => {
  describe('calculateAuto.near(bucket, duration)', () => {
    it('should calculate the bucket size for 15 minutes', () => {
      const bucketSizeDuration = calculateAuto.near(100, moment.duration(15, 'minutes'));
      expect(bucketSizeDuration).not.toBeUndefined();
      expect(isDuration(bucketSizeDuration)).toBeTruthy();
      expect(bucketSizeDuration!.asSeconds()).toBe(10);
    });
    it('should calculate the bucket size for an hour', () => {
      const bucketSizeDuration = calculateAuto.near(100, moment.duration(1, 'hour'));
      expect(bucketSizeDuration).not.toBeUndefined();
      expect(isDuration(bucketSizeDuration)).toBeTruthy();
      expect(bucketSizeDuration!.asSeconds()).toBe(30);
    });
    it('should calculate the bucket size for a day', () => {
      const bucketSizeDuration = calculateAuto.near(100, moment.duration(1, 'day'));
      expect(bucketSizeDuration).not.toBeUndefined();
      expect(isDuration(bucketSizeDuration)).toBeTruthy();
      expect(bucketSizeDuration!.asMinutes()).toBe(10);
    });
  });

  describe('calculateAuto.fixedBuckets(duration)', () => {
    const getExpectedInterval = (duration: Duration, buckets: number) =>
      moment.duration(Math.floor(duration.asMilliseconds() / buckets), 'ms').asMilliseconds();

    const testCases = roundingRules.map((rule) => {
      return {
        startHumanized: rule.interval[1].humanize(),
        endHumanized: rule.interval[0].humanize(),
        start: rule.interval[1],
        end: rule.interval[0],
        maxBuckets: rule.maxBuckets,
      };
    });

    describe.each(testCases)(
      'should return fixed interval for time range from $startHumanized to $endHumanized',
      ({ start, end, maxBuckets }) => {
        const expectedStartInterval = getExpectedInterval(start, maxBuckets);
        const expectedEndInterval = getExpectedInterval(end, maxBuckets);
        it(`start range returns ${expectedStartInterval}ms`, () => {
          const startRange = calculateAuto.fixedBuckets(start);
          expect(startRange?.asMilliseconds()).toEqual(expectedStartInterval);
        });

        it(`end range returns ${expectedStartInterval}ms`, () => {
          const endRange = calculateAuto.fixedBuckets(end);
          expect(endRange?.asMilliseconds()).toEqual(expectedEndInterval);
        });
      }
    );
  });
});
