/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SentinelOneAgentStatusClient } from './sentinel_one/sentinel_one_agent_status_client';
import type { AgentStatusClientInterface } from './lib/types';
import type { AgentStatusClientOptions } from './lib/base_agent_status_client';
import { EndpointAgentStatusClient } from './endpoint/endpoint_agent_status_client';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';

/**
 * Retrieve a agent status  client for an agent type
 * @param agentType
 * @param constructorOptions
 *
 */
export const getAgentStatusClient = (
  agentType: ResponseActionAgentType,
  constructorOptions: AgentStatusClientOptions
): AgentStatusClientInterface => {
  switch (agentType) {
    case 'endpoint':
      return new EndpointAgentStatusClient(constructorOptions);
    case 'sentinel_one':
      return new SentinelOneAgentStatusClient(constructorOptions);
  }
};
