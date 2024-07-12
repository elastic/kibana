/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentName } from '../../typings/es_schemas/ui/fields/agent';

export enum SignalTypes {
  METRICS = 'metrics',
  TRACES = 'traces',
  LOGS = 'logs',
}

export interface EntityMetrics {
  latency: number | null;
  throughput: number | null;
  failedTransactionRate: number;
  logRatePerMinute: number;
  logErrorRate: number | null;
}

export interface EntityServiceListItem {
  signalTypes: SignalTypes[];
  metrics: EntityMetrics;
  environments: string[];
  serviceName: string;
  agentName: AgentName;
}
