/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityTelemetryTaskConfig } from '../task';
import { createTelemetryDiagnosticsTaskConfig } from './diagnostic';
import { createTelemetryEndpointTaskConfig } from './endpoint';
import { createTelemetrySecurityListTaskConfig } from './security_lists';

export function createTelemetryTaskConfigs(
  maxSecurityListTelemetryBatch: number,
  maxEndpointTelemetryBatch: number
): SecurityTelemetryTaskConfig[] {
  return [
    createTelemetryDiagnosticsTaskConfig(),
    createTelemetryEndpointTaskConfig(maxEndpointTelemetryBatch),
    createTelemetrySecurityListTaskConfig(maxSecurityListTelemetryBatch),
  ];
}
