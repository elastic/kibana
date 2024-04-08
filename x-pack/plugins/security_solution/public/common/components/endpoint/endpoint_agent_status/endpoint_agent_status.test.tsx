/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../mock/endpoint';
import { createAppRootMockRenderer } from '../../../mock/endpoint';
import type { EndpointAgentStatusProps } from './endpoint_agent_status';
import { EndpointAgentStatus } from './endpoint_agent_status';
import { type AgentStatuses, HostStatus } from '../../../../../common/endpoint/types';
import React from 'react';
import { fireEvent, waitFor, within } from '@testing-library/react';
import { useAgentStatus } from '../../../hooks/use_agent_status';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';
import { ENDPOINT_CAPABILITIES } from '../../../../../common/endpoint/service/response_actions/constants';

jest.mock('../../../hooks/use_agent_status');
const useAgentStatusMock = useAgentStatus as jest.Mock;

describe('When showing Endpoint Agent Status', () => {
  let appTestContext: AppContextTestRender;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let reRender: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let testAgentId: string;

  const actionGenerator = new EndpointActionGenerator('seed');
  const getAgentStatusMock = ({
    agentId = testAgentId,
    agentType = 'endpoint',
    capabilities = [...ENDPOINT_CAPABILITIES],
    found = true,
    isolated = true,
    lastSeen = new Date().toISOString(),
    pendingActions = {},
    status = HostStatus.HEALTHY,
  }: Partial<AgentStatuses[string]>) =>
    actionGenerator.generateAgentStatus({
      agentId,
      agentType,
      capabilities,
      found,
      isolated,
      lastSeen,
      pendingActions,
      status,
    });

  const triggerTooltip = () => {
    fireEvent.mouseOver(renderResult.getByTestId('test-actionStatuses-tooltipTrigger'));
  };

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    testAgentId = 'test-agent-id-123';
  });

  describe('and using `EndpointAgentStatus` component', () => {
    let renderProps: EndpointAgentStatusProps;

    beforeEach(() => {
      useAgentStatusMock.mockReturnValue({
        data: {
          [testAgentId]: getAgentStatusMock({ isolated: true }),
        },
      });

      renderProps = {
        'data-test-subj': 'test',
        agentId: testAgentId,
      };

      render = () => {
        renderResult = appTestContext.render(<EndpointAgentStatus {...renderProps} />);
        return renderResult;
      };

      reRender = () => {
        renderResult.rerender(<EndpointAgentStatus {...renderProps} />);
        return renderResult;
      };
    });

    it('should display status', () => {
      useAgentStatusMock.mockReturnValue({
        data: {
          [testAgentId]: getAgentStatusMock({ isolated: false }),
        },
      });

      const { getByTestId } = render();
      expect(getByTestId('test').textContent).toEqual('Healthy');
    });

    it('should display status and isolated', () => {
      useAgentStatusMock.mockReturnValue({
        data: {
          [testAgentId]: getAgentStatusMock({ isolated: true }),
        },
      });

      const { getByTestId } = render();
      expect(getByTestId('test').textContent).toEqual('HealthyIsolated');
    });

    it('should display status and isolated and display other pending actions in tooltip', async () => {
      useAgentStatusMock.mockReturnValue({
        data: {
          [testAgentId]: getAgentStatusMock({
            pendingActions: {
              'get-file': 2,
              execute: 6,
            },
          }),
        },
      });

      const { getByTestId } = render();
      expect(getByTestId('test').textContent).toEqual('HealthyIsolated');

      triggerTooltip();
      await waitFor(() => {
        expect(
          within(renderResult.baseElement).getByTestId('test-actionStatuses-tooltipContent')
            .textContent
        ).toEqual('Pending actions:execute6get-file2');
      });
    });

    it('should display status and action count', async () => {
      useAgentStatusMock.mockReturnValue({
        data: {
          [testAgentId]: getAgentStatusMock({
            isolated: false,
            pendingActions: {
              'get-file': 2,
              execute: 6,
            },
          }),
        },
      });

      const { getByTestId } = render();
      expect(getByTestId('test').textContent).toEqual('Healthy8 actions pending');
    });

    it('should display status and isolating', async () => {
      useAgentStatusMock.mockReturnValue({
        data: {
          [testAgentId]: getAgentStatusMock({
            pendingActions: {
              isolate: 1,
            },
          }),
        },
      });

      const { getByTestId } = render();
      expect(getByTestId('test').textContent).toEqual('HealthyIsolating');
    });

    it.each([
      ['isolate', 'Isolating'],
      ['release', 'Releasing'],
    ])(
      'should display status and %s and have tooltip with other pending actions',
      async (action, expectedLabel) => {
        useAgentStatusMock.mockReturnValue({
          data: {
            [testAgentId]: getAgentStatusMock({
              pendingActions: {
                [action === 'release' ? 'unisolate' : action]: 1,
                'kill-process': 1,
              },
            }),
          },
        });

        const { getByTestId } = render();
        expect(getByTestId('test').textContent).toEqual(`Healthy${expectedLabel}`);

        triggerTooltip();
        await waitFor(() => {
          expect(
            within(renderResult.baseElement).getByTestId('test-actionStatuses-tooltipContent')
              .textContent
          ).toEqual(
            action === 'isolate'
              ? `Pending actions:${action}1kill-process1`
              : `Pending actions:kill-process1${action}1`
          );
        });
      }
    );

    it('should display status and releasing', async () => {
      useAgentStatusMock.mockReturnValue({
        data: {
          [testAgentId]: getAgentStatusMock({
            pendingActions: {
              unisolate: 1,
            },
          }),
        },
      });

      const { getByTestId } = render();
      expect(getByTestId('test').textContent).toEqual('HealthyReleasing');
    });

    it('should display status and releasing and show other pending actions in tooltip', async () => {
      useAgentStatusMock.mockReturnValue({
        data: {
          [testAgentId]: getAgentStatusMock({
            pendingActions: {
              unisolate: 1,
              'kill-process': 1,
            },
          }),
        },
      });

      const { getByTestId } = render();
      expect(getByTestId('test').textContent).toEqual('HealthyReleasing');

      triggerTooltip();
      await waitFor(() => {
        expect(
          within(renderResult.baseElement).getByTestId('test-actionStatuses-tooltipContent')
            .textContent
        ).toEqual('Pending actions:kill-process1release1');
      });
    });

    it('should show individual action count in tooltip (including unknown actions) sorted asc', async () => {
      useAgentStatusMock.mockReturnValue({
        data: {
          [testAgentId]: getAgentStatusMock({
            pendingActions: {
              isolate: 1,
              'get-file': 2,
              execute: 6,
              'kill-process': 1,
              foo: 2,
            },
          }),
        },
      });

      const { getByTestId } = render();
      expect(getByTestId('test').textContent).toEqual('HealthyIsolating');

      triggerTooltip();
      await waitFor(() => {
        expect(
          within(renderResult.baseElement).getByTestId('test-actionStatuses-tooltipContent')
            .textContent
        ).toEqual('Pending actions:execute6foo2get-file2isolate1kill-process1');
      });
    });

    it('should still display status and isolation state if agent status API fails', async () => {
      const { getByTestId } = render();
      expect(getByTestId('test').textContent).toEqual('HealthyIsolated');
    });

    describe('and `autoRefresh` prop is set to true', () => {
      beforeEach(() => {
        renderProps.autoRefresh = true;
      });

      it('should keep actions up to date when autoRefresh is true', async () => {
        const agentStatus = getAgentStatusMock({ isolated: false });
        useAgentStatusMock.mockReturnValue({
          data: {
            [testAgentId]: agentStatus,
          },
        });

        const { getByTestId } = render();

        expect(getByTestId('test').textContent).toEqual('Healthy');

        const newAgentStatus = {
          ...agentStatus,
          ...getAgentStatusMock({
            pendingActions: {
              'get-file': 2,
              execute: 6,
            },
          }),
        };
        useAgentStatusMock.mockReturnValue({
          data: {
            [testAgentId]: newAgentStatus,
          },
        });

        const { getByTestId: getNewTestId } = reRender();

        await waitFor(
          () => {
            expect(getNewTestId('test').textContent).toEqual('Healthy4 actions pending');
          },
          { timeout: 10000 }
        );
      });
    });
  });
});
