/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentName } from '@kbn/elastic-agent-utils';

export type {
  ElasticAgentName,
  OpenTelemetryAgentName,
  AgentName,
} from '@kbn/elastic-agent-utils';

export interface Agent {
  ephemeral_id?: string;
  name: AgentName;
  version: string;
}
