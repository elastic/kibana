/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { get } from 'lodash';
import { unitsMap } from '@elastic/datemath';

const leastCommonInterval = (num = 0, base = 0) => Math.max(Math.ceil(num / base) * base, base);

const getDateHistogramAggregation = (fieldsCapabilities, rollupIndex) => {
  const dateHistogramField = fieldsCapabilities[rollupIndex].aggs.date_histogram;

  // there is also only one valid date_histogram field
  return Object.values(dateHistogramField)[0];
};

const isCalendarInterval = ({ unit, value }) => value === 1 && ['calendar', 'mixed'].includes(unitsMap[unit].type);

export const getRollupSearchCapabilities = (DefaultSearchCapabilities) =>
  (class RollupSearchCapabilities extends DefaultSearchCapabilities {
    constructor(req, batchRequestsSupport, fieldsCapabilities, rollupIndex) {
      super(req, batchRequestsSupport, fieldsCapabilities);

      this.rollupIndex = rollupIndex;
      this.dateHistogram = getDateHistogramAggregation(fieldsCapabilities, rollupIndex);
    }

    get defaultTimeInterval() {
      return get(this.dateHistogram, 'interval', null);
    }

    get searchTimezone() {
      return get(this.dateHistogram, 'time_zone', null);
    }

    get whiteListedMetrics() {
      return {
        '*': false,
        avg: true,
        max: true,
        min: true,
        sum: true,
        count: true,
        value_count: true,
      };
    }

    get whiteListedGroupByFields() {
      return {
        '*': false,
        everything: true,
        terms: true,
      };
    }

    getValidTimeInterval(userIntervalString) {
      const parsedRollupJobInterval = this.parseInterval(this.defaultTimeInterval);
      const parsedUserInterval = this.parseInterval(userIntervalString);

      let { unit } = parsedRollupJobInterval;
      let { value } = this.convertIntervalToUnit(userIntervalString, unit);

      if (isCalendarInterval(parsedRollupJobInterval) && isCalendarInterval(parsedUserInterval)) {
        unit = value > 1 ? parsedUserInterval.unit : parsedRollupJobInterval.unit;
        value = 1;
      } else {
        value = leastCommonInterval(value, parsedRollupJobInterval.value);
      }

      return `${value}${unit}`;
    }
  });
