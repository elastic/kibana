/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callApmApi } from './create_call_apm_api';

export const createStaticDataView = async () => {
  return await callApmApi('POST /internal/apm/data_view/static', {
    signal: null,
  });
};
