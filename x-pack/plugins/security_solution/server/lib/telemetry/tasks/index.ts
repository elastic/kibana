/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityTelemetryTaskConfig } from '../task';
import { TelemetryDiagTaskConfig } from './diagnostic';
import { TelemetryEndpointTaskConfig } from './endpoint';
import { TelemetrySecurityListTaskConfig } from './security_lists';

export function listTelemetryTaskConfigs(): SecurityTelemetryTaskConfig[] {
  return [TelemetryDiagTaskConfig, TelemetryEndpointTaskConfig, TelemetrySecurityListTaskConfig];
}
