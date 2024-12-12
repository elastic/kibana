/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Duration } from 'moment';
const d = moment.duration;

type RoundingRule = [Duration, Duration];

const roundingRules: RoundingRule[] = [
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

const revRoundingRules = [...roundingRules].reverse();

type CheckFunction = (bound: Duration, interval: Duration, target: number) => Duration | null;

function find(rules: RoundingRule[], check: CheckFunction, last?: boolean) {
  function pick(buckets: number, duration: Duration): Duration | null {
    const target = duration.asMilliseconds() / buckets;
    let lastResp: Duration | null = null;

    for (let i = 0; i < rules.length; i++) {
      const [bound, interval] = rules[i];
      const resp = check(bound, interval, target);

      if (resp == null) {
        if (!last) continue;
        if (lastResp) return lastResp;
        break;
      }

      if (!last) return resp;
      lastResp = resp;
    }

    // fallback to just a number of milliseconds, ensure ms is >= 1
    const ms = Math.max(Math.floor(target), 1);
    return moment.duration(ms, 'ms');
  }

  return (buckets: number, duration: Duration): Duration | undefined => {
    const interval = pick(buckets, duration);
    if (interval) return moment.duration(interval);
  };
}

export const calculateAuto = {
  near: find(
    revRoundingRules,
    function near(bound, interval, target) {
      if (bound.asMilliseconds() > target) return interval;
      return null;
    },
    true
  ),

  lessThan: find(revRoundingRules, function lessThan(_bound, interval, target) {
    if (interval.asMilliseconds() < target) return interval;
    return null;
  }),

  atLeast: find(revRoundingRules, function atLeast(_bound, interval, target) {
    if (interval.asMilliseconds() <= target) return interval;
    return null;
  }),
};
