/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentName } from '../typings/es_schemas/ui/fields/agent';
import type { Environment } from './environment_rt';

export interface SpanLinkDetails {
  traceId: string;
  spanId: string;
  details?: {
    agentName: AgentName;
    serviceName: string;
    duration: number;
    environment: Environment;
    transactionId?: string;
    spanName?: string;
    spanSubtype?: string;
    spanType?: string;
  };
}
