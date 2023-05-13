/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsoDateString } from '@kbn/securitysolution-io-ts-types';
import type { HealthInterval } from './health_interval';

/**
 * Health request processing times and durations.
 * This metadata can be included in the health API responses.
 */
export interface HealthTimings {
  requested_at: IsoDateString;
  processed_at: IsoDateString;
  processing_time_ms: number;
}

/**
 * Base parameters of all the health API endpoints.
 * This metadata can be included in the health API responses.
 */
export interface HealthParameters {
  interval: HealthInterval;
}

/**
 * Base properties of a health snapshot (health calculation result at a given moment).
 */
export interface HealthSnapshot {
  debug?: Record<string, unknown>;
}
