/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { get } from 'lodash';

const intervalMultiple = (userTimeInterval, defaultTimeInterval) => !Boolean(userTimeInterval % defaultTimeInterval);

export default (DefaultSearchCapabilities) =>
  (class RollupSearchCapabilities extends DefaultSearchCapabilities {
    constructor(req, batchRequestsSupport, fieldsCapabilities) {
      super(req, batchRequestsSupport, fieldsCapabilities);

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
      const dateHistogramFields = this.getFieldsByAggregationType('date_histogram');
      const keys = Object.keys(dateHistogramFields);

      return dateHistogramFields[keys[0]];
    }
  });
