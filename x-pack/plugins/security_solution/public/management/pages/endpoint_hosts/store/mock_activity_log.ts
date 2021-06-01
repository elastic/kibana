/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAction } from '../../../../../common/endpoint/types';

export const mockActivityLogResponse = (agentId: string): EndpointAction[] => {
  const activityLog: EndpointAction[] = [
    {
      type: 'action',
      item: {
        action_id: `${agentId}-action_id`,
        '@timestamp': new Date().toJSON(),
        expiration: new Date().toJSON(),
        type: 'INPUT_ACTION',
        input_type: 'endpoint',
        agents: [agentId],
        user_id: 'user_odd_y',
        data: {
          command: 'isolate',
          comment: 'to isolate',
        },
      },
    },
    {
      type: 'action',
      item: {
        action_id: `${agentId}-action_id`,
        '@timestamp': new Date().toJSON(),
        expiration: new Date().toJSON(),
        type: 'INPUT_ACTION',
        input_type: 'endpoint',
        agents: [agentId],
        user_id: 'user_odd_y',
        data: {
          command: 'unisolate',
          comment: 'to unisolate',
        },
      },
    },
  ];

  return activityLog;
};
