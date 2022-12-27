/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('@kbn/babel-register').install();

const { aggregateLatencyMetrics } = require('./aggregate_latency_metrics');

aggregateLatencyMetrics().catch((err) => {
  if (err.meta && err.meta.body) {
    // error from elasticsearch client
    console.error(err.meta.body);
  } else {
    console.error(err);
  }
  process.exit(1);
});
