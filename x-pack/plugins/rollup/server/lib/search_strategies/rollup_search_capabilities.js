/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { get } from 'lodash';

const intervalMultiple = (userTimeInterval, defaultTimeInterval) => !Boolean(userTimeInterval % defaultTimeInterval);
const roundN = (num, base) => Math.ceil(num / base) * base;

export default (DefaultSearchCapabilities) =>
  (class RollupSearchCapabilities extends DefaultSearchCapabilities {
    constructor(req, batchRequestsSupport, fieldsCapabilities, rollupIndex) {
      super(req, batchRequestsSupport, fieldsCapabilities);

      this.rollupIndex = rollupIndex;
      this.init();
    }

    get fixedTimeZone() {
      return get(this.dateHistogram, 'time_zone', null);
    }

    get defaultTimeInterval() {
      return get(this.dateHistogram, 'interval', null);
    }

    init() {
      this.dateHistogram = this.getDateHistogramAggregation();

      this.validateTimeIntervalRules = [
        intervalMultiple,
      ];
    }

    getDateHistogramAggregation() {
      const dateHistogramField = this.fieldsCapabilities[this.rollupIndex].aggs.date_histogram;

      // there is also only one valid date_histogram field
      return Object.values(dateHistogramField)[0];
    }

    getValidTimeInterval(intervalString) {
      if (this.isTimeIntervalValid(intervalString)) {
        return intervalString;
      }

      const userInterval = this.getIntervalInSeconds(intervalString);

      return `${roundN(userInterval, this.defaultTimeIntervalInSeconds)}s`;
    }
  });
