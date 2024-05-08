/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { AgentStatusRecords } from '../../../../../../common/endpoint/types';

import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';
export interface AgentStatusClientInterface {
  getAgentStatuses: (agentIds: string[]) => Promise<AgentStatusRecords>;
}

export interface GetAgentStatusOptions {
  agentType: ResponseActionAgentType;
  agentIds: string[];
  connectorActionsClient: ActionsClient;
  logger: Logger;
}
