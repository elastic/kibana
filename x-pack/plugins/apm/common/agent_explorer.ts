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
  agentVersions: string[];
  latestVersion: string;
  instances: number;
}

export interface AgentExplorerDetailsListItem {
  instanceName: string;
  environments?: string[];
  version: string;
  lastReport: Date;
}

export enum AgentExplorerFieldName {
  ServiceName = 'serviceName',
  Environments = 'environments',
  AgentName = 'agentName',
  AgentVersion = 'agentVersion',
  LatestVersion = 'latestVersion',
  DocsLink = 'docsLink',
  Instances = 'instances',
}

export enum AgentExplorerDetailsFieldName {
  InstanceName = 'instanceName',
  Environments = 'environments',
  Version = 'version',
  lastReport = 'lastReport',
}
