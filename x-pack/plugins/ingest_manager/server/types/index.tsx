/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export {
  // Object types
  Agent,
  AgentSOAttributes,
  AgentType,
  AgentEvent,
  AgentEventSOAttributes,
  AgentAction,
  Datasource,
  NewDatasource,
  AgentConfig,
  NewAgentConfig,
  AgentConfigStatus,
  Output,
  NewOutput,
  OutputType,
  EnrollmentAPIKeySOAttributes,
  EnrollmentAPIKey,
  // Common schemas
  ListWithKuery,
  ListWithKuerySchema,
  // Datasource schemas
  GetDatasourcesRequestSchema,
  GetOneDatasourceRequestSchema,
  CreateDatasourceRequestSchema,
  UpdateDatasourceRequestSchema,
  // Agent schemas
  GetAgentsRequestSchema,
  GetOneAgentRequestSchema,
  GetOneAgentEventsRequestSchema,
  UpdateAgentRequestSchema,
  DeleteAgentRequestSchema,
  PostAgentCheckinRequestSchema,
  PostAgentUnenrollRequestSchema,
  PostAgentEnrollRequestSchema,
  PostAgentAcksRequestSchema,
  GetAgentStatusForPolicySchema,
  // Agent config schemas
  GetAgentConfigsRequestSchema,
  GetAgentConfigsResponse,
  GetOneAgentConfigRequestSchema,
  GetOneAgentConfigResponse,
  CreateAgentConfigRequestSchema,
  CreateAgentConfigResponse,
  UpdateAgentConfigRequestSchema,
  UpdateAgentConfigResponse,
  DeleteAgentConfigsRequestSchema,
  DeleteAgentConfigsResponse,
  // Fleet setup schemas
  GetFleetSetupRequestSchema,
  CreateFleetSetupRequestSchema,
  CreateFleetSetupResponse,
  // EPM schema
  GetPackagesRequestSchema,
  GetFileRequestSchema,
  GetInfoRequestSchema,
  InstallPackageRequestSchema,
  DeletePackageRequestSchema,
  // Enrollment API keys schemas
  GetEnrollmentAPIKeysRequestSchema,
  PostEnrollmentAPIKeyRequestSchema,
  DeleteEnrollmentAPIKeyRequestSchema,
  GetOneEnrollmentAPIKeyRequestSchema,
  // Install Script schema
  InstallScriptRequestSchema,
} from '../../common';

export type AgentConfigUpdateHandler = (
  action: 'created' | 'updated' | 'deleted',
  agentConfigId: string
) => Promise<void>;
