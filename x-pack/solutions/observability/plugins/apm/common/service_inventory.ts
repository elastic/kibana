/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentName } from '@kbn/elastic-agent-utils';
import type { GroupedStatsResult } from '@kbn/slo-schema';
import type { ServiceHealthStatus } from './service_health_status';

export type SloStatus = keyof GroupedStatsResult['summary'];

export interface ServiceListItem {
  serviceName: string;
  healthStatus?: ServiceHealthStatus;
  transactionType?: string;
  agentName?: AgentName;
  throughput?: number;
  latency?: number | null;
  transactionErrorRate?: number | null;
  environments?: string[];
  alertsCount?: number;
  overflowCount?: number | null;
  sloStatus?: SloStatus;
  sloCount?: number;
}

export enum ServiceInventoryFieldName {
  ServiceName = 'serviceName',
  HealthStatus = 'healthStatus',
  Environments = 'environments',
  TransactionType = 'transactionType',
  Throughput = 'throughput',
  Latency = 'latency',
  TransactionErrorRate = 'transactionErrorRate',
  AlertsCount = 'alertsCount',
  SloStatus = 'sloStatus',
}
