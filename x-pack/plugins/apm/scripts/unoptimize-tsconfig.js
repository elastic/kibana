/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const { unoptimizeTsConfig } = require('./optimize-tsconfig/unoptimize');

unoptimizeTsConfig().catch((err) => {
  console.error(err);
  process.exit(1);
});
