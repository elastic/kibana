/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export {
  // Object types
  Datasource,
  NewDatasource,
  AgentConfig,
  NewAgentConfig,
  AgentConfigStatus,
  Output,
  NewOutput,
  OutputType,
  // Common schemas
  ListWithKuery,
  ListWithKuerySchema,
  // Datasource schemas
  GetDatasourcesRequestSchema,
  GetOneDatasourceRequestSchema,
  CreateDatasourceRequestSchema,
  UpdateDatasourceRequestSchema,
  // Agent config schemas
  GetAgentConfigsRequestSchema,
  GetAgentConfigsResponse,
  GetOneAgentConfigRequestSchema,
  CreateAgentConfigRequestSchema,
  CreateAgentConfigResponse,
  UpdateAgentConfigRequestSchema,
  DeleteAgentConfigsRequestSchema,
  DeleteAgentConfigsResponse,
} from '../../common';

export type AgentConfigUpdateHandler = (
  action: 'created' | 'updated' | 'deleted',
  agentConfigId: string
) => Promise<void>;
