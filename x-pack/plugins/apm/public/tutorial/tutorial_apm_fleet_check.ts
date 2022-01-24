/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { callApmApi } from '../services/rest/create_call_apm_api';

export async function hasFleetApmIntegrations() {
  try {
    const { hasData = false } = await callApmApi(
      'GET /internal/apm/fleet/has_data',
      {
        signal: null,
      }
    );
    return hasData;
  } catch (e) {
    console.error('Something went wrong while fetching apm fleet data', e);
    return false;
  }
}
