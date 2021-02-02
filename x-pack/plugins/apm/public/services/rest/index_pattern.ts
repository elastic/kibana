/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callApmApi } from './createCallApmApi';

export const createStaticIndexPattern = async () => {
  return await callApmApi({
    endpoint: 'POST /api/apm/index_pattern/static',
    signal: null,
  });
};

export const getApmIndexPatternTitle = async () => {
  return await callApmApi({
    endpoint: 'GET /api/apm/index_pattern/title',
    signal: null,
  });
};
