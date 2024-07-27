/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { SignalTypes, EntityMetrics } from '../../../common/entities/types';

export interface Entity {
  id: string;
  latestTimestamp: string;
  identityFields: string[];
  metrics: EntityMetrics;
}

export interface TraceMetrics {
  latency: number | null;
  throughput: number | null;
  failedTransactionRate: number | null;
}

export interface ServiceEntities {
  serviceName: string;
  environment?: string;
  agentName: AgentName;
  signalTypes: string[];
  entity: Entity;
}

export interface EntitiesRaw {
  agent: {
    name: AgentName[];
  };
  data_stream: {
    type: string[];
  };
  service: {
    name: string;
    environment: string;
  };
  entity: Entity;
}

export interface MergedServiceEntities {
  serviceName: string;
  agentName: AgentName;
  signalTypes: SignalTypes[];
  environments: string[];
  metrics: EntityMetrics[];
}
