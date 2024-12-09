/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ActionDetails, ActionListApiResponse } from '../../../../common/endpoint/types';
import type {
  ResponseActionAgentType,
  EDRActionsApiCommandNames,
  ResponseActionStatus,
} from '../../../../common/endpoint/service/response_actions/constants';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';

export const getActionListMock = async ({
  agentTypes = ['endpoint'] as ResponseActionAgentType[],
  agentIds: _agentIds,
  hosts,
  agentState,
  commands,
  actionCount = 0,
  endDate,
  page = 1,
  pageSize = 10,
  startDate,
  userIds,
  isCompleted = true,
  isExpired = false,
  wasSuccessful = true,
  errors,
  status = 'successful',
  outputs = {},
}: {
  agentTypes?: ResponseActionAgentType[];
  agentState?: Pick<ActionDetails, 'agentState'>;
  agentIds?: string[];
  hosts?: Record<string, { name: string }>;
  commands?: string[];
  actionCount?: number;
  endDate?: string;
  page?: number;
  pageSize?: number;
  startDate?: string;
  userIds?: string[];
  isCompleted?: boolean;
  isExpired?: boolean;
  wasSuccessful?: boolean;
  errors?: string[];
  status?: ResponseActionStatus;
  outputs?: Pick<ActionDetails, 'outputs'>;
}): Promise<ActionListApiResponse> => {
  const endpointActionGenerator = new EndpointActionGenerator('seed');

  const agentIds = _agentIds ?? [uuidv4()];

  const actionIds = Array(actionCount)
    .fill(1)
    .map(() => uuidv4());

  const actionDetails: ActionListApiResponse['data'] = actionIds.map((actionId) => {
    const command = (commands?.[0] ?? 'isolate') as EDRActionsApiCommandNames<'endpoint'>;
    const actionDetailsOverrides = {
      agents: agentIds,
      hosts,
      command,
      id: actionId,
      isCompleted,
      isExpired,
      wasSuccessful,
      status,
      completedAt: isExpired ? undefined : new Date().toISOString(),
      agentState,
      errors,
      outputs,
    };
    return endpointActionGenerator.generateActionDetails(actionDetailsOverrides);
  });

  return {
    page,
    pageSize,
    startDate,
    endDate,
    agentTypes,
    elasticAgentIds: agentIds,
    commands,
    data: actionDetails,
    userIds,
    statuses: undefined,
    total: actionDetails.length ?? 0,
  };
};
