/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { isDuration, Duration } from 'moment';
const d = moment.duration;

const roundingRules = [
  [d(500, 'ms'), d(100, 'ms')],
  [d(5, 'second'), d(1, 'second')],
  [d(7.5, 'second'), d(5, 'second')],
  [d(15, 'second'), d(10, 'second')],
  [d(45, 'second'), d(30, 'second')],
  [d(3, 'minute'), d(1, 'minute')],
  [d(9, 'minute'), d(5, 'minute')],
  [d(20, 'minute'), d(10, 'minute')],
  [d(45, 'minute'), d(30, 'minute')],
  [d(2, 'hour'), d(1, 'hour')],
  [d(6, 'hour'), d(3, 'hour')],
  [d(24, 'hour'), d(12, 'hour')],
  [d(1, 'week'), d(1, 'd')],
  [d(3, 'week'), d(1, 'week')],
  [d(1, 'year'), d(1, 'month')],
  [d(Infinity, 'year'), d(1, 'year')],
];

const reverseRoundingRules = [...roundingRules].reverse();
type CheckFunction = (bound: Duration, interval: Duration, target: number) => Duration | undefined;

function findRule(rules: Duration[][], check: CheckFunction, last?: boolean) {
  function pickInterval(buckets: number, duration: Duration) {
    const target = duration.asMilliseconds() / buckets;
    let lastResult = null;

    for (const [end, start] of rules) {
      const result = check(end, start, target);

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

export const calculateAuto = {
  near: findRule(
    reverseRoundingRules,
    function near(bound, interval, target) {
      if (isDuration(bound) && bound.asMilliseconds() > target) return interval;
    },
    true
  ),
  lessThan: findRule(
    reverseRoundingRules,
    function lessThan(_bound: Duration, interval: Duration, target: number) {
      if (interval.asMilliseconds() < target) return interval;
    }
  ),
  atLeast: findRule(
    reverseRoundingRules,
    function atLeast(_bound: Duration, interval: Duration, target: number) {
      if (interval.asMilliseconds() <= target) return interval;
    }
  ),
};
