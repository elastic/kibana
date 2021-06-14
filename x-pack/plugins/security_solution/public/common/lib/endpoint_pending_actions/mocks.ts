/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PendingActionsResponse } from '../../../../common/endpoint/types';
import {
  httpHandlerMockFactory,
  ResponseProvidersInterface,
} from '../../mock/endpoint/http_handler_mock_factory';
import { ACTION_STATUS_ROUTE } from '../../../../common/endpoint/constants';

export const pendingActionsResponseMock = (): PendingActionsResponse => ({
  data: [
    {
      agent_id: '111-111',
      pending_actions: {
        isolate: 1,
      },
    },
    {
      agent_id: '222-222',
      pending_actions: {
        unisolate: 1,
      },
    },
    {
      agent_id: '333-333',
      pending_actions: {},
    },
  ],
});

export type PendingActionsHttpMockProviders = ResponseProvidersInterface<{
  pendingActions: () => PendingActionsResponse;
}>;

export const pendingActionsHttpMocks = httpHandlerMockFactory<PendingActionsHttpMockProviders>([
  {
    id: 'pendingActions',
    method: 'get',
    path: ACTION_STATUS_ROUTE,
    handler: () => pendingActionsResponseMock(),
  },
]);
