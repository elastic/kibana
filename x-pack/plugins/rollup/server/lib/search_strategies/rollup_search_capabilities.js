/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { merge } from 'lodash';

const toFieldsCapabilities = (rollupData) => {
  return Object.keys(rollupData).reduce((capabilities, rollupIndex) => {
    return (rollupData[rollupIndex].rollup_jobs || [])
      .reduce((acc, job) => merge(acc, job.fields), {});
  }, {});
};

export default (DefaultSearchCapabilities) =>
  (class RollupSearchCapabilities extends DefaultSearchCapabilities {
    constructor(req, batchRequestsSupport, rollupCapabilities) {
      const fieldsCapabilities = toFieldsCapabilities(rollupCapabilities);

      super(req, batchRequestsSupport, fieldsCapabilities);
    }

    getTimeZone() {
      // todo: to be refactored
      return 'UTC';
    }
  });
