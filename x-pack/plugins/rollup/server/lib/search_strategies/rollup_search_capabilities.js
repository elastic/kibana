/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { get } from 'lodash';

const leastCommonInterval = (num = 0, base = 0) => Math.max(Math.ceil(num / base) * base, base);

const getDateHistogramAggregation = (fieldsCapabilities, rollupIndex) => {
  const dateHistogramField = fieldsCapabilities[rollupIndex].aggs.date_histogram;

  // there is also only one valid date_histogram field
  return Object.values(dateHistogramField)[0];
};

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

    getValidTimeInterval(intervalString) {
      const { unit, value } = this.parseInterval(this.defaultTimeInterval);
      const parsedIntervalString = this.convertIntervalToUnit(intervalString, unit);
      const commonInterval = leastCommonInterval(parsedIntervalString.value, value);

      return `${commonInterval}${unit}`;
    }
  });
