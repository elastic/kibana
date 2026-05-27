/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Use with `feature_flags.overrides` in kibana.yml to toggle CPS integration for APM. */
export const OBSERVABILITY_APM_CPS_ENABLED_FEATURE_FLAG = 'observability.apm.cpsEnabled' as const;

/**
 * Fallback when the flag is unset and no override exists (same default as the removed
 * `xpack.apm.featureFlags.apmCPSEnabled` setting).
 */
export const OBSERVABILITY_APM_CPS_ENABLED_DEFAULT = true;
