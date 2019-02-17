/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { get } from 'lodash';

const leastCommonInterval = (num, base) => Math.max(Math.ceil(Math.floor(num) / base) * base, base);

export default (DefaultSearchCapabilities) =>
  (class RollupSearchCapabilities extends DefaultSearchCapabilities {
    constructor(req, batchRequestsSupport, fieldsCapabilities, rollupIndex) {
      super(req, batchRequestsSupport, fieldsCapabilities);

      this.rollupIndex = rollupIndex;
      this.dateHistogram = this.getDateHistogramAggregation();
    }

    get defaultTimeInterval() {
      return get(this.dateHistogram, 'interval', null);
    }

    getSearchTimezone() {
      return get(this.dateHistogram, 'time_zone', null);
    }

    getDateHistogramAggregation() {
      const dateHistogramField = this.fieldsCapabilities[this.rollupIndex].aggs.date_histogram;

      // there is also only one valid date_histogram field
      return Object.values(dateHistogramField)[0];
    }

    getValidTimeInterval(intervalString) {
      const parsedDefaultInterval = this.parseInterval(this.defaultTimeInterval);
      const parsedIntervalString = this.convertIntervalToUnit(intervalString, parsedDefaultInterval.unit);
      const commonInterval = leastCommonInterval(parsedIntervalString.value, parsedDefaultInterval.value);

      return `${commonInterval}${parsedDefaultInterval.unit}`;
    }
  });
