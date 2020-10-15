/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// eslint-disable-next-line import/no-extraneous-dependencies
require('@kbn/optimizer').registerNodeAutoTranspilation();

const {
  aggregateLatencyMetrics,
} = require('./aggregate-latency-metrics/index.ts');

aggregateLatencyMetrics().catch((err) => {
  if (err.meta && err.meta.body) {
    // error from elasticsearch client
    console.error(err.meta.body);
  } else {
    console.error(err);
  }
  process.exit(1);
});
