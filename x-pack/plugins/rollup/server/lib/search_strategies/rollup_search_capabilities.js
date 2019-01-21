/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { merge, get } from 'lodash';

const toFieldsCapabilities = (rollupData) => {
  return Object.keys(rollupData).reduce((capabilities, rollupIndex) => {
    return (rollupData[rollupIndex].rollup_jobs || [])
      .reduce((acc, job) => merge(acc, job.fields), {});
  }, {});
};

const getDateHistogramField = (fieldsCapabilities) => {
  let histogramAggregation = null;

  Object.keys(fieldsCapabilities).some((fieldKey) => {
    fieldsCapabilities[fieldKey].some((aggregation) => {
      if (aggregation.agg === 'date_histogram') {
        histogramAggregation = aggregation;
      }
      return Boolean(histogramAggregation);
    });
    return Boolean(histogramAggregation);
  });
  return histogramAggregation;
};

export default (DefaultSearchCapabilities) =>
  (class RollupSearchCapabilities extends DefaultSearchCapabilities {
    constructor(req, batchRequestsSupport, rollupCapabilities) {
      const fieldsCapabilities = toFieldsCapabilities(rollupCapabilities);

      super(req, batchRequestsSupport, fieldsCapabilities);

      this.dateHistogram = getDateHistogramField(fieldsCapabilities);
    }

    get fixedTimeZone() {
      return get(this.dateHistogram, 'time_zone', null);
    }

    get minimumTimeInterval() {
      return get(this.dateHistogram, 'interval', null);
    }
  });
