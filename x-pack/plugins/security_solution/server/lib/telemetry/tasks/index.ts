/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityTelemetryTaskConfig } from '../task';
import { createTelemetryDiagnosticsTaskConfig } from './diagnostic';
import { createTelemetryEndpointTaskConfig } from './endpoint';
import { createTelemetrySecurityListTaskConfig } from './security_lists';
import { createTelemetryDetectionRuleListsTaskConfig } from './detection_rule';
import { createTelemetryPrebuiltRuleAlertsTaskConfig } from './prebuilt_rule_alerts';
import { createTelemetryTimelineTaskConfig } from './timelines';
import { createTelemetryDiagnosticTimelineTaskConfig } from './timelines_diagnostic';
import { createTelemetryConfigurationTaskConfig } from './configuration';
import { telemetryConfiguration } from '../configuration';
import { createTelemetryFilterListArtifactTaskConfig } from './filterlists';

export function createTelemetryTaskConfigs(): SecurityTelemetryTaskConfig[] {
  return [
    createTelemetryDiagnosticsTaskConfig(),
    createTelemetryEndpointTaskConfig(telemetryConfiguration.max_security_list_telemetry_batch),
    createTelemetrySecurityListTaskConfig(telemetryConfiguration.max_endpoint_telemetry_batch),
    createTelemetryDetectionRuleListsTaskConfig(
      telemetryConfiguration.max_detection_rule_telemetry_batch
    ),
    createTelemetryPrebuiltRuleAlertsTaskConfig(telemetryConfiguration.max_detection_alerts_batch),
    createTelemetryTimelineTaskConfig(),
    createTelemetryDiagnosticTimelineTaskConfig(),
    createTelemetryConfigurationTaskConfig(),
    createTelemetryFilterListArtifactTaskConfig(),
  ];
}
