/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callApmApi } from './createCallApmApi';

export const createStaticIndexPattern = async () => {
  return await callApmApi({
    endpoint: 'POST /api/apm/index_pattern/static',
    signal: null,
  });
};
