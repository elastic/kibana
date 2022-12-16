/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { isDuration, Duration } from 'moment';
const d = moment.duration;

const roundingRules = [
  { interval: [d(500, 'ms'), d(100, 'ms')], maxBuckets: 100 },
  { interval: [d(5, 'second'), d(1, 'second')], maxBuckets: 100 },
  { interval: [d(7.5, 'second'), d(5, 'second')], maxBuckets: 100 },
  { interval: [d(15, 'second'), d(10, 'second')], maxBuckets: 60 },
  { interval: [d(45, 'second'), d(30, 'second')], maxBuckets: 60 },
  { interval: [d(3, 'minute'), d(1, 'minute')], maxBuckets: 60 },
  { interval: [d(9, 'minute'), d(5, 'minute')], maxBuckets: 60 },
  { interval: [d(20, 'minute'), d(10, 'minute')], maxBuckets: 30 },
  { interval: [d(45, 'minute'), d(30, 'minute')], maxBuckets: 30 },
  { interval: [d(2, 'hour'), d(1, 'hour')], maxBuckets: 15 },
  { interval: [d(6, 'hour'), d(3, 'hour')], maxBuckets: 15 },
  { interval: [d(24, 'hour'), d(7, 'hour')], maxBuckets: 10 },
  { interval: [d(1, 'week'), d(1, 'd')], maxBuckets: 6 },
  { interval: [d(3, 'week'), d(1, 'week')], maxBuckets: 4 },
  { interval: [d(1, 'year'), d(1, 'month')], maxBuckets: 4 },
  { interval: [d(Infinity), d(1, 'year')], maxBuckets: 4 },
];

const reverseRoundingRules = roundingRules.map((p) => p.interval).reverse();

type CheckFunction = (bound: Duration, interval: Duration, target: number) => Duration | undefined;

function FindFixedBucketsRule(rules: typeof roundingRules, check: CheckFunction) {
  function pickInterval(duration: Duration) {
    for (const { interval, maxBuckets } of rules) {
      const result = check(interval[0], interval[1], duration.asMilliseconds());

      if (result) {
        return moment.duration(Math.floor(duration.asMilliseconds() / maxBuckets), 'ms');
      }
    }

    return d(1, 'minute');
  }

  return (duration: Duration) => {
    const interval = pickInterval(duration);
    if (isDuration(interval)) return interval;
  };
}

function findRule(rules: Duration[][], check: CheckFunction, last?: boolean) {
  function pickInterval(buckets: number, duration: Duration) {
    const target = duration.asMilliseconds() / buckets;
    let lastResult = null;

    for (const rule of rules) {
      const result = check(rule[0], rule[1], target);

      if (result == null) {
        if (!last) continue;
        if (lastResult) return lastResult;
        break;
      }

      if (!last) return result;
      lastResult = result;
    }

    // fallback to just a number of milliseconds, ensure ms is >= 1
    const ms = Math.max(Math.floor(target), 1);
    return moment.duration(ms, 'ms');
  }

  return (buckets: number, duration: Duration) => {
    const interval = pickInterval(buckets, duration);
    if (isDuration(interval)) return interval;
  };
}

const getNearInterval = (bound: Duration, interval: Duration, target: number) => {
  if (isDuration(bound) && bound.asMilliseconds() > target) return interval;
};

const getLessThan = (_bound: Duration, interval: Duration, target: number) => {
  if (interval.asMilliseconds() < target) return interval;
};

const getAtLeast = (_bound: Duration, interval: Duration, target: number) => {
  if (interval.asMilliseconds() <= target) return interval;
};

const getGreaterOrEqualThan = (bound: Duration, interval: Duration, target: number) => {
  if (isDuration(bound) && bound.asMilliseconds() >= target) return interval;
};

export const calculateAuto = {
  near: findRule(reverseRoundingRules, getNearInterval, true),
  lessThan: findRule(reverseRoundingRules, getLessThan),
  atLeast: findRule(reverseRoundingRules, getAtLeast),
  fixedBuckets: FindFixedBucketsRule(roundingRules, getGreaterOrEqualThan),
};
