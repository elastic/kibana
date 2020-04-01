/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Based on the original Kibana ui/time_buckets/calc_auto_interval.js but with
// a few modifications:
//   - edit to the near rule, so that it returns either the
//    upper or lower rule bound, depending on which is closest to the
//    supplied target.
//   - edit to the lessThan rule so that the interval returned gives
//     fewer buckets than the supplied target.
//   - edits to the list of roundingRules to align better with the
//    Ml job bucket span options.

import moment from 'moment';
const { duration: d } = moment;

export function timeBucketsCalcAutoIntervalProvider() {
  // Note there is a current issue with Kibana (Kibana issue #9184)
  // which means we can't round to, for example, 2 week or 3 week buckets,
  // so there is a large gap between the 1 week and 1 month rule.
  const roundingRules = [
    [d(500, 'ms'), d(100, 'ms')],
    [d(5, 'second'), d(1, 'second')],
    [d(10, 'second'), d(5, 'second')],
    [d(15, 'second'), d(10, 'second')],
    [d(30, 'second'), d(15, 'second')],
    [d(1, 'minute'), d(30, 'second')],
    [d(5, 'minute'), d(1, 'minute')],
    [d(10, 'minute'), d(5, 'minute')],
    [d(15, 'minute'), d(10, 'minute')],
    [d(30, 'minute'), d(10, 'minute')],
    [d(1, 'hour'), d(30, 'minute')],
    [d(2, 'hour'), d(1, 'hour')],
    [d(4, 'hour'), d(2, 'hour')],
    [d(6, 'hour'), d(4, 'hour')],
    [d(8, 'hour'), d(6, 'hour')],
    [d(12, 'hour'), d(8, 'hour')],
    [d(24, 'hour'), d(12, 'hour')],
    [d(2, 'd'), d(1, 'd')],
    [d(4, 'd'), d(2, 'd')],
    [d(1, 'week'), d(4, 'd')],
    //[ d(2, 'week'), d(1, 'week') ],
    //[ d(1, 'month'), d(2, 'week') ],
    [d(1, 'month'), d(1, 'week')],
    [d(1, 'year'), d(1, 'month')],
    [Infinity, d(1, 'year')],
  ];

  const revRoundingRules = roundingRules.slice(0).reverse();

  function find(rules, check, last) {
    function pick(buckets, duration) {
      const target = duration / buckets;
      let lastResp;

      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        const resp = check(rule[0], rule[1], target);

        if (resp == null) {
          if (!last) {
            continue;
          }
          if (lastResp) {
            return lastResp;
          }
          break;
        }

        if (!last) {
          return resp;
        }
        lastResp = resp;
      }

      // fallback to just a number of milliseconds, ensure ms is >= 1
      const ms = Math.max(Math.floor(target), 1);
      return moment.duration(ms, 'ms');
    }

    return function(buckets, duration) {
      const interval = pick(buckets, duration);
      if (interval) {
        return moment.duration(interval._data);
      }
    };
  }

  return {
    near: find(
      revRoundingRules,
      function near(upperBound, lowerBound, target) {
        // upperBound - first duration in rule
        // lowerBound - second duration in rule
        // target - target interval in milliseconds.
        if (upperBound > target) {
          if (upperBound === Infinity) {
            return lowerBound;
          }

          const boundMs = upperBound.asMilliseconds();
          const intervalMs = lowerBound.asMilliseconds();
          const retInterval =
            Math.abs(boundMs - target) <= Math.abs(intervalMs) ? upperBound : lowerBound;
          return retInterval;
        }
      },
      true
    ),

    lessThan: find(revRoundingRules, function(upperBound, lowerBound, target) {
      // upperBound - first duration in rule
      // lowerBound - second duration in rule
      // target - target interval in milliseconds. Must not return intervals less than this duration.
      if (lowerBound < target) {
        return upperBound !== Infinity ? upperBound : lowerBound;
      }
    }),

    atLeast: find(revRoundingRules, function atLeast(upperBound, lowerBound, target) {
      // Unmodified from Kibana ui/time_buckets/calc_auto_interval.js.
      if (lowerBound <= target) {
        return lowerBound;
      }
    }),
  };
}
