/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../kibana';
import { coreMock } from '@kbn/core/public/mocks';
import { fetchPendingActionsByAgentId } from './endpoint_pending_actions';
import { pendingActionsHttpMock, pendingActionsResponseMock } from './mocks';
import { ACTION_STATUS_ROUTE } from '../../../../common/endpoint/constants';

jest.mock('../kibana');

describe('when using endpoint pending actions api service', () => {
  let coreHttp: ReturnType<typeof coreMock.createStart>['http'];

  beforeEach(() => {
    const coreStartMock = coreMock.createStart();
    coreHttp = coreStartMock.http;
    pendingActionsHttpMock(coreHttp);
    (KibanaServices.get as jest.Mock).mockReturnValue(coreStartMock);
  });

  it('should call the endpont pending action status API', async () => {
    const agentIdList = ['111-111', '222-222'];
    const response = await fetchPendingActionsByAgentId(agentIdList);

    expect(response).toEqual(pendingActionsResponseMock());
    expect(coreHttp.get).toHaveBeenCalledWith(ACTION_STATUS_ROUTE, {
      query: {
        agent_ids: agentIdList,
      },
    });
  });
});
