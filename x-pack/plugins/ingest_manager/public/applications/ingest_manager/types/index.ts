/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export {
  // Object types
  Agent,
  AgentConfig,
  NewAgentConfig,
  AgentEvent,
  EnrollmentAPIKey,
  // API schemas - Agent Config
  GetAgentConfigsResponse,
  GetOneAgentConfigResponse,
  CreateAgentConfigRequestSchema,
  CreateAgentConfigResponse,
  UpdateAgentConfigRequestSchema,
  UpdateAgentConfigResponse,
  DeleteAgentConfigsRequestSchema,
  DeleteAgentConfigsResponse,
  // API schemas - Agents
  GetAgentsResponse,
  GetOneAgentResponse,
  PostAgentUnenrollResponse,
  GetOneAgentEventsResponse,
  // API schemas - Enrollment API Keys
  GetEnrollmentAPIKeysResponse,
  GetOneEnrollmentAPIKeyResponse,
} from '../../../../common';
