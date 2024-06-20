/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AgentStatus } from './agent_status';
import { useGetAgentStatus as _useGetAgentStatus } from '../../../../../management/hooks/agents/use_get_agent_status';
import {
  RESPONSE_ACTION_AGENT_TYPE,
  type ResponseActionAgentType,
} from '../../../../../../common/endpoint/service/response_actions/constants';
import type { AppContextTestRender } from '../../../../mock/endpoint';
import { createAppRootMockRenderer } from '../../../../mock/endpoint';
import { HostStatus } from '../../../../../../common/endpoint/types';

jest.mock('../../../../hooks/use_experimental_features');
jest.mock('../../../../../management/hooks/agents/use_get_agent_status');

const useGetAgentStatusMock = _useGetAgentStatus as jest.Mock;

describe('AgentStatus component', () => {
  let render: (agentType?: ResponseActionAgentType) => ReturnType<AppContextTestRender['render']>;
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
    render = (agentType?: ResponseActionAgentType) =>
      (renderResult = mockedContext.render(
        <AgentStatus agentId={agentId} agentType={agentType || 'endpoint'} data-test-subj="test" />
      ));

    useGetAgentStatusMock.mockReturnValue({ data: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe.each(RESPONSE_ACTION_AGENT_TYPE)('`%s` agentType', (agentType) => {
    it('should show agent health status info', () => {
      useGetAgentStatusMock.mockReturnValue({
        data: {
          [agentId]: { ...baseData, agentType, status: HostStatus.OFFLINE },
        },
        isLoading: false,
        isFetched: true,
      });

      render(agentType);
      const statusBadge = renderResult.getByTestId('test-agentStatus');
      const actionStatusBadge = renderResult.queryByTestId('test-actionStatuses');

      expect(statusBadge.textContent).toEqual('Offline');
      expect(actionStatusBadge).toBeFalsy();
    });

    it('should show agent health status info and Isolated status', () => {
      useGetAgentStatusMock.mockReturnValue({
        data: {
          [agentId]: {
            ...baseData,
            agentType,
            isolated: true,
          },
        },
        isLoading: false,
        isFetched: true,
      });

      render(agentType);
      const statusBadge = renderResult.getByTestId('test-agentStatus');
      const actionStatusBadge = renderResult.getByTestId('test-actionStatuses');

      expect(statusBadge.textContent).toEqual('Healthy');
      expect(actionStatusBadge.textContent).toEqual('Isolated');
    });

    it('should show agent health status info and Releasing status', () => {
      useGetAgentStatusMock.mockReturnValue({
        data: {
          [agentId]: {
            ...baseData,
            agentType,
            isolated: true,
            pendingActions: {
              unisolate: 1,
            },
          },
        },
        isLoading: false,
        isFetched: true,
      });

      render(agentType);
      const statusBadge = renderResult.getByTestId('test-agentStatus');
      const actionStatusBadge = renderResult.getByTestId('test-actionStatuses');

      expect(statusBadge.textContent).toEqual('Healthy');
      expect(actionStatusBadge.textContent).toEqual('Releasing');
    });

    it('should show agent health status info and Isolating status', () => {
      useGetAgentStatusMock.mockReturnValue({
        data: {
          [agentId]: {
            ...baseData,
            agentType,
            pendingActions: {
              isolate: 1,
            },
          },
        },
        isLoading: false,
        isFetched: true,
      });

      render(agentType);
      const statusBadge = renderResult.getByTestId('test-agentStatus');
      const actionStatusBadge = renderResult.getByTestId('test-actionStatuses');

      expect(statusBadge.textContent).toEqual('Healthy');
      expect(actionStatusBadge.textContent).toEqual('Isolating');
    });

    it('should show agent health status info and Releasing status also when multiple actions are pending', () => {
      useGetAgentStatusMock.mockReturnValue({
        data: {
          [agentId]: {
            ...baseData,
            agentType,
            isolated: true,
            pendingActions: {
              unisolate: 1,
              execute: 1,
              'kill-process': 1,
            },
          },
        },
        isLoading: false,
        isFetched: true,
      });

      render(agentType);
      const statusBadge = renderResult.getByTestId('test-agentStatus');
      const actionStatusBadge = renderResult.getByTestId('test-actionStatuses');

      expect(statusBadge.textContent).toEqual('Healthy');
      expect(actionStatusBadge.textContent).toEqual('Releasing');
    });

    it('should show agent health status info and Isolating status also when multiple actions are pending', () => {
      useGetAgentStatusMock.mockReturnValue({
        data: {
          [agentId]: {
            ...baseData,
            agentType,
            pendingActions: {
              isolate: 1,
              execute: 1,
              'kill-process': 1,
            },
          },
        },
        isLoading: false,
        isFetched: true,
      });

      render(agentType);
      const statusBadge = renderResult.getByTestId('test-agentStatus');
      const actionStatusBadge = renderResult.getByTestId('test-actionStatuses');

      expect(statusBadge.textContent).toEqual('Healthy');
      expect(actionStatusBadge.textContent).toEqual('Isolating');
    });

    it('should show agent health status info and pending action status when not isolating/releasing', () => {
      useGetAgentStatusMock.mockReturnValue({
        data: {
          [agentId]: {
            ...baseData,
            agentType,
            pendingActions: {
              'kill-process': 1,
              'running-processes': 1,
            },
          },
        },
        isLoading: false,
        isFetched: true,
      });

      render(agentType);
      const statusBadge = renderResult.getByTestId('test-agentStatus');
      const actionStatusBadge = renderResult.getByTestId('test-actionStatuses');

      expect(statusBadge.textContent).toEqual('Healthy');
      expect(actionStatusBadge.textContent).toEqual('2 actions pending');
    });

    it('should show agent health status info and Isolated when pending actions', () => {
      useGetAgentStatusMock.mockReturnValue({
        data: {
          [agentId]: {
            ...baseData,
            agentType,
            isolated: true,
            pendingActions: {
              'kill-process': 1,
              'running-processes': 1,
            },
          },
        },
        isLoading: false,
        isFetched: true,
      });

      render(agentType);
      const statusBadge = renderResult.getByTestId('test-agentStatus');
      const actionStatusBadge = renderResult.getByTestId('test-actionStatuses');

      expect(statusBadge.textContent).toEqual('Healthy');
      expect(actionStatusBadge.textContent).toEqual('Isolated');
    });
  });
});
