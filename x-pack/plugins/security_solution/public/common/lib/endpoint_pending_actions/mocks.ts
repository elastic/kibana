/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PendingActionsRequestQuery,
  PendingActionsResponse,
} from '../../../../common/endpoint/types';
import type { ResponseProvidersInterface } from '../../mock/endpoint/http_handler_mock_factory';
import { httpHandlerMockFactory } from '../../mock/endpoint/http_handler_mock_factory';
import { ACTION_STATUS_ROUTE } from '../../../../common/endpoint/constants';

export const pendingActionsResponseMock = (): PendingActionsResponse => ({
  data: [
    {
      agent_id: '111-111',
      pending_actions: {},
    },
    {
      agent_id: '222-222',
      pending_actions: {
        isolate: 1,
      },
    },
  ],
});

export type PendingActionsHttpMockInterface = ResponseProvidersInterface<{
  pendingActions: () => PendingActionsResponse;
}>;

export const pendingActionsHttpMock = httpHandlerMockFactory<PendingActionsHttpMockInterface>([
  {
    id: 'pendingActions',
    method: 'get',
    path: ACTION_STATUS_ROUTE,
    /** Will build a response based on the number of agent ids received. */
    handler: (options) => {
      const agentIds = (options.query as PendingActionsRequestQuery).agent_ids as string[];

      if (agentIds.length) {
        return {
          data: agentIds.map((id, index) => ({
            agent_id: id,
            pending_actions:
              index % 2 // index's of the array that are not divisible by 2 will will have `isolate: 1`
                ? {
                    isolate: 1,
                  }
                : {},
          })),
        };
      }

      return pendingActionsResponseMock();
    },
  },
]);
