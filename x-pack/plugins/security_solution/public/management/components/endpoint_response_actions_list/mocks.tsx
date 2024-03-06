/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ActionListApiResponse } from '../../../../common/endpoint/types';
import type {
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
  ResponseActionStatus,
} from '../../../../common/endpoint/service/response_actions/constants';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';

export const getActionListMock = async ({
  agentTypes = ['endpoint'] as ResponseActionAgentType[],
  agentIds: _agentIds,
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
  status = 'successful',
}: {
  agentTypes?: ResponseActionAgentType[];
  agentIds?: string[];
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
  status?: ResponseActionStatus;
}): Promise<ActionListApiResponse> => {
  const endpointActionGenerator = new EndpointActionGenerator('seed');

  const agentIds = _agentIds ?? [uuidv4()];

  const data: ActionListApiResponse['data'] = agentIds.map((id) => {
    const actionIds = Array(actionCount)
      .fill(1)
      .map(() => uuidv4());

    const actionDetails: ActionListApiResponse['data'] = actionIds.map((actionId) => {
      const command = (commands?.[0] ?? 'isolate') as ResponseActionsApiCommandNames;
      return endpointActionGenerator.generateActionDetails({
        agents: [id],
        command,
        id: actionId,
        isCompleted,
        isExpired,
        wasSuccessful,
        status,
        completedAt: isExpired ? undefined : new Date().toISOString(),
        hosts: {
          ...(command === 'upload'
            ? {
                [id]: { name: 'host name' },
              }
            : {}),
        },
        agentState: {
          ...(command === 'upload'
            ? {
                [id]: {
                  errors: undefined,
                  wasSuccessful: true,
                  isCompleted: true,
                  completedAt: '2023-05-10T20:09:25.824Z',
                },
              }
            : {}),
        },
        outputs: {
          ...(command === 'upload'
            ? {
                [id]: {
                  type: 'json',
                  content: {
                    code: 'ra_upload_file-success',
                    path: 'some/path/to/file',
                    disk_free_space: 123445,
                  },
                },
              }
            : {}),
        },
      });
    });
    return actionDetails;
  })[0];

  return {
    page,
    pageSize,
    startDate,
    endDate,
    agentTypes,
    elasticAgentIds: agentIds,
    commands,
    data,
    userIds,
    statuses: undefined,
    total: data.length ?? 0,
  };
};
