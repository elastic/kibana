/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject, isString, ary, sortBy, assign } from 'lodash';
import moment from 'moment';
import dateMath from '@kbn/datemath';

import { timeBucketsCalcAutoIntervalProvider } from './calc_auto_interval';
import { parseInterval } from '../../../common/util/parse_interval';
import { getFieldFormats, getUiSettings } from './dependency_cache';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';

const unitsDesc = dateMath.unitsDesc;

// Index of the list of time interval units at which larger units (i.e. weeks, months, years) need
// need to be converted to multiples of the largest unit supported in ES aggregation intervals (i.e. days).
// Note that similarly the largest interval supported for ML bucket spans is 'd'.
const timeUnitsMaxSupportedIndex = unitsDesc.indexOf('w');

const calcAuto = timeBucketsCalcAutoIntervalProvider();

export function getTimeBucketsFromCache() {
  const uiSettings = getUiSettings();
  return new TimeBuckets({
    [UI_SETTINGS.HISTOGRAM_MAX_BARS]: uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
    [UI_SETTINGS.HISTOGRAM_BAR_TARGET]: uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
    dateFormat: uiSettings.get('dateFormat'),
    'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
  });
}

/**
 * Helper object for wrapping the concept of an "Interval", which
 * describes a timespan that will separate buckets of time,
 * for example the interval between points on a time series chart.
 */
export function TimeBuckets(timeBucketsConfig) {
  this._timeBucketsConfig = timeBucketsConfig;
  this.barTarget = this._timeBucketsConfig[UI_SETTINGS.HISTOGRAM_BAR_TARGET];
  this.maxBars = this._timeBucketsConfig[UI_SETTINGS.HISTOGRAM_MAX_BARS];
}

/**
 * Set the target number of bars.
 *
 * @param {number} bt - target number of bars (buckets).
 *
 * @returns {undefined}
 */
TimeBuckets.prototype.setBarTarget = function (bt) {
  this.barTarget = bt;
};

/**
 * Set the maximum number of bars.
 *
 * @param {number} mb - maximum number of bars (buckets).
 *
 * @returns {undefined}
 */
TimeBuckets.prototype.setMaxBars = function (mb) {
  this.maxBars = mb;
};

/**
 * Set the bounds that these buckets are expected to cover.
 * This is required to support interval "auto" as well
 * as interval scaling.
 *
 * @param {object} input - an object with properties min and max,
 *                       representing the edges for the time span
 *                       we should cover
 *
 * @returns {undefined}
 */
TimeBuckets.prototype.setBounds = function (input) {
  if (!input) return this.clearBounds();

  let bounds;
  if (isPlainObject(input)) {
    // accept the response from timefilter.getActiveBounds()
    bounds = [input.min, input.max];
  } else {
    bounds = Array.isArray(input) ? input : [];
  }

  const moments = sortBy(bounds.map(ary(moment, 1)), Number);

  const valid = moments.length === 2 && moments.every(isValidMoment);
  if (!valid) {
    this.clearBounds();
    throw new Error('invalid bounds set: ' + input);
  }

  this._lb = moments.shift();
  this._ub = moments.pop();
  if (this.getDuration().asSeconds() < 0) {
    throw new TypeError('Intervals must be positive');
  }
};

/**
 * Clear the stored bounds
 *
 * @return {undefined}
 */
TimeBuckets.prototype.clearBounds = function () {
  this._lb = this._ub = null;
};

/**
 * Check to see if we have received bounds yet
 *
 * @return {Boolean}
 */
TimeBuckets.prototype.hasBounds = function () {
  return isValidMoment(this._ub) && isValidMoment(this._lb);
};

/**
 * Return the current bounds, if we have any.
 *
 * Note that this does not clone the bounds, so editing them may have unexpected side-effects.
 * Always call bounds.min.clone() before editing.
 *
 * @return {object|undefined} - If bounds are not defined, this
 *                      returns undefined, else it returns the bounds
 *                      for these buckets. This object has two props,
 *                      min and max. Each property will be a moment()
 *                      object
 */
TimeBuckets.prototype.getBounds = function () {
  if (!this.hasBounds()) return;
  return {
    min: this._lb,
    max: this._ub,
  };
};

/**
 * Get a moment duration object representing
 * the distance between the bounds, if the bounds
 * are set.
 *
 * @return {moment.duration|undefined}
 */
TimeBuckets.prototype.getDuration = function () {
  if (!this.hasBounds()) return;
  return moment.duration(this._ub - this._lb, 'ms');
};

/**
 * Update the interval at which buckets should be
 * generated.
 *
 * Input can be one of the following:
 *  - "auto"
 *  - an interval String, such as 7d, 1h or 30m which can be parsed to a moment duration using ml/common/util/parse_interval
 *  - a moment.duration object.
 *
 * @param {string|moment.duration} input - see desc
 */
TimeBuckets.prototype.setInterval = function (input) {
  // Preserve the original units because they're lost when the interval is converted to a
  // moment duration object.
  this.originalInterval = input;

  let interval = input;

  if (!interval || interval === 'auto') {
    this._i = 'auto';
    return;
  }

  if (isString(interval)) {
    input = interval;
    interval = parseInterval(interval);
    if (+interval === 0) {
      interval = null;
    }
  }

  // If the value wasn't converted to a duration, and isn't already a duration, we have a problem
  if (!moment.isDuration(interval)) {
    throw new TypeError('"' + input + '" is not a valid interval.');
  }

  this._i = interval;
};

/**
 * Get the interval for the buckets. If the
 * number of buckets created by the interval set
 * is larger than config:histogram:maxBars then the
 * interval will be scaled up. If the number of buckets
 * created is less than one, the interval is scaled back.
 *
 * The interval object returned is a moment.duration
 * object that has been decorated with the following
 * properties.
 *
 * interval.description: a text description of the interval.
 *   designed to be used list "field per {{ desc }}".
 *     - "minute"
 *     - "10 days"
 *     - "3 years"
 *
 * interval.expr: the elasticsearch expression that creates this
 *   interval. If the interval does not properly form an elasticsearch
 *   expression it will be forced into one.
 *
 * interval.scaled: the interval was adjusted to
 *   accommodate the maxBars setting.
 *
 * interval.scale: the number that y-values should be
 *   multiplied by
 *
 * interval.scaleDescription: a description that reflects
 *   the values which will be produced by using the
 *   interval.scale.
 *
 *
 * @return {[type]} [description]
 */
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
    return assign(scaled, {
      preScaled: interval,
      scale: interval / scaled,
      scaled: true,
    });
  }
};

/**
 * Returns an interval which in the last step of calculation is rounded to
 * the closest multiple of the supplied divisor (in seconds).
 *
 * @return {moment.duration|undefined}
 */
TimeBuckets.prototype.getIntervalToNearestMultiple = function (divisorSecs) {
  const interval = this.getInterval();
  const intervalSecs = interval.asSeconds();

  const remainder = intervalSecs % divisorSecs;
  if (remainder === 0) {
    return interval;
  }

  // Create a new interval which is a multiple of the supplied divisor (not zero).
  let nearestMultiple =
    remainder > divisorSecs / 2 ? intervalSecs + divisorSecs - remainder : intervalSecs - remainder;
  nearestMultiple = nearestMultiple === 0 ? divisorSecs : nearestMultiple;
  const nearestMultipleInt = moment.duration(nearestMultiple, 'seconds');
  decorateInterval(nearestMultipleInt, this.getDuration());

  // Check to see if the new interval is scaled compared to the original.
  const preScaled = interval.preScaled;
  if (preScaled !== undefined && preScaled < nearestMultipleInt) {
    nearestMultipleInt.preScaled = preScaled;
    nearestMultipleInt.scale = preScaled / nearestMultipleInt;
    nearestMultipleInt.scaled = true;
  }

  return nearestMultipleInt;
};

/**
 * Get a date format string that will represent dates that
 * progress at our interval.
 *
 * Since our interval can be as small as 1ms, the default
 * date format is usually way too much. with `dateFormat:scaled`
 * users can modify how dates are formatted within series
 * produced by TimeBuckets
 *
 * @return {string}
 */
TimeBuckets.prototype.getScaledDateFormat = function () {
  const interval = this.getInterval();
  const rules = this._timeBucketsConfig['dateFormat:scaled'];

  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i];
    if (!rule[0] || interval >= moment.duration(rule[0])) {
      return rule[1];
    }
  }

  return this._timeBucketsConfig.dateFormat;
};

TimeBuckets.prototype.getScaledDateFormatter = function () {
  const fieldFormats = getFieldFormats();
  const DateFieldFormat = fieldFormats.getType(FIELD_FORMAT_IDS.DATE);
  return new DateFieldFormat(
    {
      pattern: this.getScaledDateFormat(),
    },
    // getConfig
    this._timeBucketsConfig
  );
};

// Appends some TimeBuckets specific properties to the moment.js duration interval.
// Uses the originalDuration from which the time bucket was created to calculate the overflow
// property (i.e. difference between the supplied duration and the calculated bucket interval).
function decorateInterval(interval, originalDuration) {
  const esInterval = calcEsInterval(interval);
  interval.esValue = esInterval.value;
  interval.esUnit = esInterval.unit;
  interval.expression = esInterval.expression;
  interval.overflow =
    originalDuration > interval ? moment.duration(interval - originalDuration) : false;

  const prettyUnits = moment.normalizeUnits(esInterval.unit);
  if (esInterval.value === 1) {
    interval.description = prettyUnits;
  } else {
    interval.description = `${esInterval.value} ${prettyUnits}s`;
  }

  return interval;
}

function isValidMoment(m) {
  return m && 'isValid' in m && m.isValid();
}

export function getBoundsRoundedToInterval(bounds, interval, inclusiveEnd = false) {
  // Returns new bounds, created by flooring the min of the provided bounds to the start of
  // the specified interval (a moment duration), and rounded upwards (Math.ceil) to 1ms before
  // the start of the next interval (Kibana dashboards search >= bounds min, and <= bounds max,
  // so we subtract 1ms off the max to avoid querying start of the new Elasticsearch aggregation bucket).
  const intervalMs = interval.asMilliseconds();
  const adjustedMinMs = Math.floor(bounds.min.valueOf() / intervalMs) * intervalMs;
  let adjustedMaxMs = Math.ceil(bounds.max.valueOf() / intervalMs) * intervalMs;

  // Don't include the start ms of the next bucket unless specified..
  if (inclusiveEnd === false) {
    adjustedMaxMs = adjustedMaxMs - 1;
  }
  return { min: moment(adjustedMinMs), max: moment(adjustedMaxMs) };
}

export function calcEsInterval(duration) {
  // Converts a moment.duration into an Elasticsearch compatible interval expression,
  // and provides associated metadata.

  // Note this was a copy of Kibana's original ui/time_buckets/calc_es_interval,
  // but with the definition of a 'large' unit changed from 'M' to 'w',
  // bringing it into line with the time units supported by Elasticsearch
  for (let i = 0; i < unitsDesc.length; i++) {
    const unit = unitsDesc[i];
    const val = duration.as(unit);
    // find a unit that rounds neatly
    if (val >= 1 && Math.floor(val) === val) {
      // Apart from for date histograms, ES only supports time units up to 'd',
      // meaning we can't for example use 'w' for job bucket spans.
      // See https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#time-units
      // So keep going until we get out of the "large" units.
      if (i <= timeUnitsMaxSupportedIndex) {
        continue;
      }

      return {
        value: val,
        unit: unit,
        expression: val + unit,
      };
    }
  }

  const ms = duration.as('ms');
  return {
    value: ms,
    unit: 'ms',
    expression: ms + 'ms',
  };
}
