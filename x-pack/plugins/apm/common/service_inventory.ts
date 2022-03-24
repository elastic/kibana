/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentName } from '../typings/es_schemas/ui/fields/agent';
import { ServiceHealthStatus } from './service_health_status';

export interface ServiceListItem {
  serviceName: string;
  healthStatus?: ServiceHealthStatus;
  transactionType?: string;
  agentName?: AgentName;
  throughput?: number;
  latency?: number | null;
  transactionErrorRate?: number | null;
  environments?: string[];
}

export enum ServiceInventoryFieldName {
  ServiceName = 'serviceName',
  HealthStatus = 'healthStatus',
  Environments = 'environments',
  TransactionType = 'transactionType',
  Throughput = 'throughput',
  Latency = 'latency',
  FailureRate = 'failureRate',
}
