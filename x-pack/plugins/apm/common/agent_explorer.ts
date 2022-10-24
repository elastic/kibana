/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentName } from "../typings/es_schemas/ui/fields/agent";

export interface AgentExplorerListItem {
  serviceName: string;
  environments?: string[];
  agentName?: AgentName;
  agentVersion: string[];
  agentLastVersion?: string;
  agentRepoUrl?: string;
}

export enum AgentExplorerFieldName {
  ServiceName = 'serviceName',
  Environments = 'environments',
  AgentName = 'agentName',
  AgentVersion = 'agentVersion',
  AgentLastVersion = 'agentLastVersion',
  AgentRepoUrl = 'agentRepoUrl',
}
