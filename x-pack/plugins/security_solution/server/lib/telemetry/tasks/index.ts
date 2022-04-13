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
import { createTelemetryDetectionRuleListsTaskConfig } from './detection_rule';
import { createTelemetryPrebuiltRuleAlertsTaskConfig } from './prebuilt_rule_alerts';
import {
  MAX_SECURITY_LIST_TELEMETRY_BATCH,
  MAX_ENDPOINT_TELEMETRY_BATCH,
  MAX_DETECTION_RULE_TELEMETRY_BATCH,
  MAX_DETECTION_ALERTS_BATCH,
} from '../constants';

export function createTelemetryTaskConfigs(): SecurityTelemetryTaskConfig[] {
  return [
    createTelemetryDiagnosticsTaskConfig(),
    createTelemetryEndpointTaskConfig(MAX_SECURITY_LIST_TELEMETRY_BATCH),
    createTelemetrySecurityListTaskConfig(MAX_ENDPOINT_TELEMETRY_BATCH),
    createTelemetryDetectionRuleListsTaskConfig(MAX_DETECTION_RULE_TELEMETRY_BATCH),
    createTelemetryPrebuiltRuleAlertsTaskConfig(MAX_DETECTION_ALERTS_BATCH),
  ];
}
