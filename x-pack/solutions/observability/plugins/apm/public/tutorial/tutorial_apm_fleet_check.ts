/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getApmInternalServices } from '../plugin';

export async function hasFleetApmIntegrations() {
  const { callApmApi } = getApmInternalServices();
  try {
    const { hasApmPolicies = false } = await callApmApi(
      'GET /internal/apm/fleet/has_apm_policies',
      { signal: null }
    );
    return hasApmPolicies;
  } catch (e) {
    console.error('Something went wrong while fetching apm fleet data', e);
    return false;
  }
}
