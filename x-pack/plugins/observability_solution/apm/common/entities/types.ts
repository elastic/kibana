/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsRatesMetrics } from '@kbn/logs-data-access-plugin/server';
import { AgentName } from '../../typings/es_schemas/ui/fields/agent';

export enum SignalTypes {
  METRICS = 'metrics',
  LOGS = 'logs',
}

export interface TraceMetrics {
  latency: number | null;
  throughput: number | null;
  failedTransactionRate: number | null;
}

export interface EntityServiceListItem {
  signalTypes: SignalTypes[];
  metrics: TraceMetrics & LogsRatesMetrics;
  environments: string[];
  serviceName: string;
  agentName: AgentName;
}

export interface EntityServicesResponse {
  services: Array<EntityServiceListItem>;
}
