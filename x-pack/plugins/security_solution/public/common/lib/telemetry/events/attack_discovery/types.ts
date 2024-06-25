/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
import type { TelemetryEventTypes } from '../../constants';

export interface ReportAttackDiscoveriesGeneratedParams {
  actionTypeId: string;
  provider?: string;
  model?: string;
  durationMs: number;
  alertsContextCount: number;
  alertsCount: number;
  configuredAlertsCount: number;
}

export type ReportAttackDiscoveryTelemetryEventParams = ReportAttackDiscoveriesGeneratedParams;

export interface AttackDiscoveryTelemetryEvent {
  eventType: TelemetryEventTypes.AttackDiscoveriesGenerated;
  schema: RootSchema<ReportAttackDiscoveriesGeneratedParams>;
}
