/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import moment from 'moment';
import { search, FIELD_FORMAT_IDS, UI_SETTINGS } from '../../../../../src/plugins/data/public';
import { calcAutoIntervalLessThan, calcAutoIntervalNear } from './calc_auto_interval';
import {
  convertDurationToNormalizedEsInterval,
  convertIntervalToEsInterval,
} from './calc_es_interval';
const { parseInterval } = search.aggs;

function isValidMoment(m) {
  return m && 'isValid' in m && m.isValid();
}

/**
 * Helper class for wrapping the concept of an "Interval",
 * which describes a timespan that will separate moments.
 *
 * @param {state} object - one of ""
 * @param {[type]} display [description]
 */
function TimeBuckets(uiSettings, data) {
  this.data = data;
  this.getConfig = (...args) => uiSettings.get(...args);
  return TimeBuckets.__cached__(this);
}

/****
 *  PUBLIC API
 ****/

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
  if (_.isPlainObject(input)) {
    // accept the response from timefilter.getActiveBounds()
    bounds = [input.min, input.max];
  } else {
    bounds = Array.isArray(input) ? input : [];
  }

  const moments = _(bounds).map(_.ary(moment, 1)).sortBy(Number);

  const valid = moments.size() === 2 && moments.every(isValidMoment);
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
 * THIS DOES NOT CLONE THE BOUNDS, so editing them
 * may have unexpected side-effects. Always
 * call bounds.min.clone() before editing
 *
 * @return {object|undefined} - If bounds are not defined, this
 *                      returns undefined, else it returns the bounds
 *                      for these buckets. This object has two props,
 *                      min and max. Each property will be a moment()
 *                      object
 *
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
 *  - Any object from src/plugins/data/public/search/aggs/buckets/_interval_options.ts
 *  - "auto"
 *  - Pass a valid moment unit
 *  - a moment.duration object.
 *
 * @param {object|string|moment.duration} input - see desc
 */
TimeBuckets.prototype.setInterval = function (input) {
  // Preserve the original units because they're lost when the interval is converted to a
  // moment duration object.
  this.originalInterval = input;

  let interval = input;

  // selection object -> val
  if (_.isObject(input)) {
    interval = input.val;
  }

  if (!interval || interval === 'auto') {
    this._i = 'auto';
    return;
  }

  if (_.isString(interval)) {
    input = interval;
    interval = parseInterval(interval);
    if (+interval === 0) {
      interval = null;
    }
  }

  // if the value wasn't converted to a duration, and isn't
  // already a duration, we have a problem
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
TimeBuckets.prototype.getInterval = function (useNormalizedEsInterval = true) {
  const self = this;
  const duration = self.getDuration();
  const parsedInterval = readInterval();

  if (useNormalizedEsInterval) {
    return decorateInterval(maybeScaleInterval(parsedInterval));
  } else {
    return decorateInterval(parsedInterval);
  }

  // either pull the interval from state or calculate the auto-interval
  function readInterval() {
    const interval = self._i;
    if (moment.isDuration(interval)) return interval;
    return calcAutoIntervalNear(self.getConfig(UI_SETTINGS.HISTOGRAM_BAR_TARGET), Number(duration));
  }

  // check to see if the interval should be scaled, and scale it if so
  function maybeScaleInterval(interval) {
    if (!self.hasBounds()) return interval;

    const maxLength = self.getConfig(UI_SETTINGS.HISTOGRAM_MAX_BARS);
    const approxLen = duration / interval;
    let scaled;

    if (approxLen > maxLength) {
      scaled = calcAutoIntervalLessThan(maxLength, Number(duration));
    } else {
      return interval;
    }

    if (+scaled === +interval) return interval;

    decorateInterval(interval);
    return _.assign(scaled, {
      preScaled: interval,
      scale: interval / scaled,
      scaled: true,
    });
  }

  // append some TimeBuckets specific props to the interval
  function decorateInterval(interval) {
    const esInterval = useNormalizedEsInterval
      ? convertDurationToNormalizedEsInterval(interval)
      : convertIntervalToEsInterval(self.originalInterval);
    interval.esValue = esInterval.value;
    interval.esUnit = esInterval.unit;
    interval.expression = esInterval.expression;
    interval.overflow = duration > interval ? moment.duration(interval - duration) : false;

    const prettyUnits = moment.normalizeUnits(esInterval.unit);
    if (esInterval.value === 1) {
      interval.description = prettyUnits;
    } else {
      interval.description = esInterval.value + ' ' + prettyUnits + 's';
    }

    return interval;
  }
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
  const rules = this.getConfig('dateFormat:scaled');

  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i];
    if (!rule[0] || interval >= moment.duration(rule[0])) {
      return rule[1];
    }
  }

  return this.getConfig('dateFormat');
};

TimeBuckets.prototype.getScaledDateFormatter = function () {
  const fieldFormats = this.data.fieldFormats;
  const DateFieldFormat = fieldFormats.getType(FIELD_FORMAT_IDS.DATE);

  return new DateFieldFormat(
    {
      pattern: this.getScaledDateFormat(),
    },
    this.getConfig.bind(this)
  );
};

TimeBuckets.__cached__ = function (self) {
  let cache = {};
  const sameMoment = same(moment.isMoment);
  const sameDuration = same(moment.isDuration);

  const desc = {
    __cached__: {
      value: self,
    },
  };

  const breakers = {
    setBounds: 'bounds',
    clearBounds: 'bounds',
    setInterval: 'interval',
  };

  const resources = {
    bounds: {
      setup: function () {
        return [self._lb, self._ub];
      },
      changes: function (prev) {
        return !sameMoment(prev[0], self._lb) || !sameMoment(prev[1], self._ub);
      },
    },
    interval: {
      setup: function () {
        return self._i;
      },
      changes: function (prev) {
        return !sameDuration(prev, this._i);
      },
    },
  };

  function cachedGetter(prop) {
    return {
      value: function cachedGetter(...rest) {
        if (cache.hasOwnProperty(prop)) {
          return cache[prop];
        }

        return (cache[prop] = self[prop](...rest));
      },
    };
  }

  function cacheBreaker(prop) {
    const resource = resources[breakers[prop]];
    const setup = resource.setup;
    const changes = resource.changes;
    const fn = self[prop];

    return {
      value: function cacheBreaker() {
        const prev = setup.call(self);
        const ret = fn.apply(self, arguments);

        if (changes.call(self, prev)) {
          cache = {};
        }

        return ret;
      },
    };
  }

  function same(checkType) {
    return function (a, b) {
      if (a === b) return true;
      if (checkType(a) === checkType(b)) return +a === +b;
      return false;
    };
  }

  _.forOwn(TimeBuckets.prototype, function (fn, prop) {
    if (prop[0] === '_') return;

    if (breakers.hasOwnProperty(prop)) {
      desc[prop] = cacheBreaker(prop);
    } else {
      desc[prop] = cachedGetter(prop);
    }
  });

  return Object.create(self, desc);
};

export { TimeBuckets };
