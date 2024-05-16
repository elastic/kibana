/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../../common/mock/endpoint';
import { AgentInfo } from './agent_info';
import {
  useAgentStatusHook,
  useGetAgentStatus,
} from '../../../../../hooks/agents/use_get_agent_status';
import type { ResponseActionAgentType } from '../../../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../../../../../../common/endpoint/service/response_actions/constants';
import type { Platform } from '../platforms';
import { HostStatus } from '../../../../../../../common/endpoint/types';

jest.mock('../../../../../hooks/agents/use_get_agent_status');

const getAgentStatusMock = useGetAgentStatus as jest.Mock;
const useAgentStatusHookMock = useAgentStatusHook as jest.Mock;

describe('Responder header Agent Info', () => {
  let render: (
    agentType?: ResponseActionAgentType,
    platform?: Platform
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  const agentId = 'agent-id-1234';
  const baseData = {
    agentId,
    found: true,
    isolated: false,
    lastSeen: new Date().toISOString(),
    pendingActions: {},
    status: HostStatus.HEALTHY,
  };

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    render = (agentType?: ResponseActionAgentType, platform?: Platform) =>
      (renderResult = mockedContext.render(
        <AgentInfo
          agentId={agentId}
          agentType={agentType || 'endpoint'}
          hostName={'test-agent'}
          platform={platform || 'linux'}
        />
      ));

    getAgentStatusMock.mockReturnValue({ data: {} });
    useAgentStatusHookMock.mockImplementation(() => useGetAgentStatus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe.each(RESPONSE_ACTION_AGENT_TYPE)('`%s` agentType', (agentType) => {
    it('should show endpoint name', async () => {
      getAgentStatusMock.mockReturnValue({
        data: {
          [agentId]: { ...baseData, agentType, status: HostStatus.OFFLINE },
        },
        isLoading: false,
        isFetched: true,
      });
      render(agentType);

      const name = await renderResult.findByTestId('responderHeaderHostName');
      expect(name.textContent).toBe('test-agent');
    });

    it('should show agent and isolation status', async () => {
      getAgentStatusMock.mockReturnValue({
        data: {
          [agentId]: {
            ...baseData,
            agentType,
            status: HostStatus.HEALTHY,
            pendingActions: { isolate: 1 },
          },
        },
        isLoading: false,
        isFetched: true,
      });
      render(agentType);

      const agentStatus = await renderResult.findByTestId(
        `responderHeader-${agentType}-agentIsolationStatus`
      );
      expect(agentStatus.textContent).toBe(`HealthyIsolating`);
    });

    it('should show last checkin time', async () => {
      getAgentStatusMock.mockReturnValue({
        data: {
          [agentId]: { ...baseData, agentType, status: HostStatus.HEALTHY },
        },
        isLoading: false,
        isFetched: true,
      });
      render(agentType);

      const lastUpdated = await renderResult.findByTestId('responderHeaderLastSeen');
      expect(lastUpdated).toBeTruthy();
    });

    it('should show platform icon', async () => {
      getAgentStatusMock.mockReturnValue({
        data: {
          [agentId]: { ...baseData, agentType, status: HostStatus.OFFLINE },
        },
        isLoading: false,
        isFetched: true,
      });
      render(agentType);

      const platformIcon = await renderResult.findByTestId('responderHeaderHostPlatformIcon');
      expect(platformIcon).toBeTruthy();
    });
  });
});
