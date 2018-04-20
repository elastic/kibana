/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



// custom TimeBuckets which inherits from the standrd kibana TimeBuckets
// this adds the ability to override the barTarget and maxBars settings
// allowing for a more granular visualization interval without having to
// modify the global settings stored in the kibana config

import _ from 'lodash';
import moment from 'moment';

import { TimeBucketsCalcAutoIntervalProvider } from 'plugins/ml/util/ml_calc_auto_interval';
import { inherits } from 'plugins/ml/util/inherits';
import { TimeBucketsCalcEsIntervalProvider } from 'ui/time_buckets/calc_es_interval';

import { TimeBucketsProvider } from 'ui/time_buckets';
export function IntervalHelperProvider(Private, timefilter, config) {

  const calcAuto = Private(TimeBucketsCalcAutoIntervalProvider);
  const calcEsInterval = Private(TimeBucketsCalcEsIntervalProvider);

  inherits(TimeBuckets, Private(TimeBucketsProvider));

  function TimeBuckets() {
    this.barTarget = config.get('histogram:barTarget');
    this.maxBars = config.get('histogram:maxBars');

    // return TimeBuckets.Super.call(this);
  }

  TimeBuckets.prototype.setBarTarget = function (bt) {
    this.barTarget = bt;
  };

  TimeBuckets.prototype.setMaxBars = function (mb) {
    this.maxBars = mb;
  };

  TimeBuckets.prototype.getInterval = function () {
    const self = this;
    const duration = self.getDuration();
    return decorateInterval(maybeScaleInterval(readInterval()), duration);

    // either pull the interval from state or calculate the auto-interval
    function readInterval() {
      const interval = self._i;
      if (moment.isDuration(interval)) return interval;
      return calcAuto.near(self.barTarget, duration);
    }

    // check to see if the interval should be scaled, and scale it if so
    function maybeScaleInterval(interval) {
      if (!self.hasBounds()) return interval;

      const maxLength = self.maxBars;
      const approxLen = duration / interval;
      let scaled;

      // If the number of buckets we got back from using the barTarget is less than
      // maxBars, than use the lessThan rule to try and get closer to maxBars.
      if (approxLen > maxLength) {
        scaled = calcAuto.lessThan(maxLength, duration);
      } else {
        return interval;
      }

      if (+scaled === +interval) return interval;

      decorateInterval(interval, duration);
      return _.assign(scaled, {
        preScaled: interval,
        scale: interval / scaled,
        scaled: true
      });
    }

  };

  // Returns an interval which in the last step of calculation is rounded to
  // the closest multiple of the supplied divisor (in seconds).
  TimeBuckets.prototype.getIntervalToNearestMultiple = function (divisorSecs) {
    const interval = this.getInterval();
    const intervalSecs = interval.asSeconds();

    const remainder = intervalSecs % divisorSecs;
    if (remainder === 0) {
      return interval;
    }

    // Create a new interval which is a multiple of the supplied divisor (not zero).
    let nearestMultiple = remainder > (divisorSecs / 2) ?
      intervalSecs + divisorSecs - remainder : intervalSecs - remainder;
    nearestMultiple = nearestMultiple === 0 ? divisorSecs : nearestMultiple;
    const nearestMultipleInt = moment.duration(nearestMultiple, 'seconds');
    decorateInterval(nearestMultipleInt, this.getDuration());

    // Check to see if the new interval is scaled compared to the original.
    const preScaled = _.get(interval, 'preScaled');
    if (preScaled !== undefined && preScaled < nearestMultipleInt) {
      nearestMultipleInt.preScaled = preScaled;
      nearestMultipleInt.scale = preScaled / nearestMultipleInt;
      nearestMultipleInt.scaled = true;
    }

    return nearestMultipleInt;
  };

  // Appends some TimeBuckets specific properties to the momentjs duration interval.
  // Uses the originalDuration from which the time bucket was created to calculate the overflow
  // property (i.e. difference between the supplied duration and the calculated bucket interval).
  function decorateInterval(interval, originalDuration) {
    const esInterval = calcEsInterval(interval);
    interval.esValue = esInterval.value;
    interval.esUnit = esInterval.unit;
    interval.expression = esInterval.expression;
    interval.overflow = originalDuration > interval ? moment.duration(interval - originalDuration) : false;

    const prettyUnits = moment.normalizeUnits(esInterval.unit);
    if (esInterval.value === 1) {
      interval.description = prettyUnits;
    } else {
      interval.description = `${esInterval.value} ${prettyUnits}s`;
    }

    return interval;
  }


  return TimeBuckets;
}

export function getBoundsRoundedToInterval(bounds, interval, inclusiveEnd = false) {
  // Returns new bounds, created by flooring the min of the provided bounds to the start of
  // the specified interval (a moment duration), and rounded upwards (Math.ceil) to 1ms before
  // the start of the next interval (Kibana dashboards search >= bounds min, and <= bounds max,
  // so we subtract 1ms off the max to avoid querying start of the new Elasticsearch aggregation bucket).
  const intervalMs = interval.asMilliseconds();
  const adjustedMinMs = (Math.floor(bounds.min.valueOf() / intervalMs)) * intervalMs;
  let adjustedMaxMs = (Math.ceil(bounds.max.valueOf() / intervalMs)) * intervalMs;

  // Don't include the start ms of the next bucket unless specified..
  if (inclusiveEnd === false) {
    adjustedMaxMs = adjustedMaxMs - 1;
  }
  return { min: moment(adjustedMinMs), max: moment(adjustedMaxMs) };
}

