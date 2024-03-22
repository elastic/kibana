/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import React from 'react';
import { HostStatus } from '../../../../../common/endpoint/types';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { useAgentStatus } from '../../../../common/hooks/use_agent_status';
import { OfflineCallout } from './offline_callout';

jest.mock('../../../hooks/endpoint/use_get_endpoint_details');
jest.mock('../../../../common/hooks/use_agent_status');

const useAgentStatusMock = useAgentStatus as jest.Mock;

describe('Responder offline callout', () => {
  let render: (agentType?: ResponseActionAgentType) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    render = (agentType?: ResponseActionAgentType) =>
      (renderResult = mockedContext.render(
        <OfflineCallout
          endpointId={'1234'}
          agentType={agentType || 'endpoint'}
          hostName="Host name"
        />
      ));
    useAgentStatusMock.mockReturnValue({ data: {} });
    render();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each(['endpoint', 'sentinel_one'] as ResponseActionAgentType[])(
    'should be visible when agent type is %s and host is offline',
    (agentType) => {
      useAgentStatusMock.mockReturnValue({
        data: {
          '1234': {
            status: HostStatus.OFFLINE,
          },
        },
      });

      render(agentType);
      const callout = renderResult.queryByTestId('offlineCallout');
      expect(callout).toBeTruthy();
    }
  );

  it.each(['endpoint', 'sentinel_one'] as ResponseActionAgentType[])(
    'should not be visible when agent type is %s and host is online',
    (agentType) => {
      useAgentStatusMock.mockReturnValue({
        data: {
          '1234': {
            status: HostStatus.HEALTHY,
          },
        },
      });
      render(agentType);
      const callout = renderResult.queryByTestId('offlineCallout');
      expect(callout).toBeFalsy();
    }
  );
});
