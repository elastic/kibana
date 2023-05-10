/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsoDateString } from '@kbn/securitysolution-io-ts-types';
import type { HealthInterval } from './health_interval';

export interface HealthResponseMetadata {
  request_received_at: IsoDateString;
  response_generated_at: IsoDateString;
  processing_time_ms: number;
  interval: HealthInterval;
}
