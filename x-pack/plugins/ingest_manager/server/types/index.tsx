/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export {
  // Types
  ListWithKuery,
  DataStream,
  NewDataStream,
  AgentConfig,
  NewAgentConfig,
  AgentConfigStatus,
  // Common schemas
  ListWithKuerySchema,
  // Data stream schemas
  GetDataStreamsRequestSchema,
  GetOneDataStreamRequestSchema,
  CreateDataStreamRequestSchema,
  UpdateDataStreamRequestSchema,
  // Agent config schemas
  GetAgentConfigsRequestSchema,
  GetOneAgentConfigRequestSchema,
  CreateAgentConfigRequestSchema,
  UpdateAgentConfigRequestSchema,
  DeleteAgentConfigsRequestSchema,
} from '../../common';

export type AgentConfigUpdateHandler = (
  action: 'created' | 'updated' | 'deleted',
  policyId: string
) => Promise<void>;
