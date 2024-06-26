/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender } from '../../../../../mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../mock/endpoint';
import type {
  EndpointAgentStatusByIdProps,
  EndpointAgentStatusProps,
} from './endpoint_agent_status';
import { EndpointAgentStatus, EndpointAgentStatusById } from './endpoint_agent_status';
import type {
  EndpointPendingActions,
  HostInfoInterface,
} from '../../../../../../../common/endpoint/types';
import { HostStatus } from '../../../../../../../common/endpoint/types';
import React from 'react';
import { EndpointActionGenerator } from '../../../../../../../common/endpoint/data_generators/endpoint_action_generator';
import { EndpointDocGenerator } from '../../../../../../../common/endpoint/generate_data';
import { composeHttpHandlerMocks } from '../../../../../mock/endpoint/http_handler_mock_factory';
import type { EndpointMetadataHttpMocksInterface } from '../../../../../../management/pages/endpoint_hosts/mocks';
import { endpointMetadataHttpMocks } from '../../../../../../management/pages/endpoint_hosts/mocks';
import type { ResponseActionsHttpMocksInterface } from '../../../../../../management/mocks/response_actions_http_mocks';
import { responseActionsHttpMocks } from '../../../../../../management/mocks/response_actions_http_mocks';
import { waitFor, within, fireEvent } from '@testing-library/react';
import { getEmptyValue } from '../../../../empty_value';
import { clone, set } from 'lodash';

type AgentStatusApiMocksInterface = EndpointMetadataHttpMocksInterface &
  ResponseActionsHttpMocksInterface;

// API mocks composed from the endpoint metadata API mock and the response actions API mocks
const agentStatusApiMocks = composeHttpHandlerMocks<AgentStatusApiMocksInterface>([
  endpointMetadataHttpMocks,
  responseActionsHttpMocks,
]);

describe('When showing Endpoint Agent Status', () => {
  const ENDPOINT_ISOLATION_OBJ_PATH = 'metadata.Endpoint.state.isolation';

  let appTestContext: AppContextTestRender;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let endpointDetails: HostInfoInterface;
  let actionsSummary: EndpointPendingActions;
  let apiMocks: ReturnType<typeof agentStatusApiMocks>;

  const triggerTooltip = () => {
    fireEvent.mouseOver(renderResult.getByTestId('test-actionStatuses-tooltipTrigger'));
  };

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    apiMocks = agentStatusApiMocks(appTestContext.coreStart.http);

    const actionGenerator = new EndpointActionGenerator('seed');

    actionsSummary = actionGenerator.generateAgentPendingActionsSummary();
    actionsSummary.pending_actions = {};
    apiMocks.responseProvider.agentPendingActionsSummary.mockImplementation(() => {
      return {
        data: [actionsSummary],
      };
    });

    const metadataGenerator = new EndpointDocGenerator('seed');

    endpointDetails = {
      metadata: metadataGenerator.generateHostMetadata(),
      host_status: HostStatus.HEALTHY,
    } as HostInfoInterface;
    apiMocks.responseProvider.metadataDetails.mockImplementation(() => endpointDetails);
  });

  describe('and using `EndpointAgentStatus` component', () => {
    let renderProps: EndpointAgentStatusProps;

    beforeEach(() => {
      renderProps = {
        'data-test-subj': 'test',
        endpointHostInfo: endpointDetails,
      };

      render = () => {
        renderResult = appTestContext.render(<EndpointAgentStatus {...renderProps} />);
        return renderResult;
      };
    });

    it('should display status', () => {
      const { getByTestId } = render();

      expect(getByTestId('test').textContent).toEqual('Healthy');
    });

    it('should display status and isolated', () => {
      set(endpointDetails, ENDPOINT_ISOLATION_OBJ_PATH, true);
      const { getByTestId } = render();

      expect(getByTestId('test').textContent).toEqual('HealthyIsolated');
    });

    it('should display status and isolated and display other pending actions in tooltip', async () => {
      set(endpointDetails, ENDPOINT_ISOLATION_OBJ_PATH, true);
      actionsSummary.pending_actions = {
        'get-file': 2,
        execute: 6,
      };
      const { getByTestId } = render();

      await waitFor(() => {
        expect(apiMocks.responseProvider.agentPendingActionsSummary).toHaveBeenCalled();
      });

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
      actionsSummary.pending_actions = {
        'get-file': 2,
        execute: 6,
      };
      const { getByTestId } = render();

      await waitFor(() => {
        expect(apiMocks.responseProvider.agentPendingActionsSummary).toHaveBeenCalled();
      });

      expect(getByTestId('test').textContent).toEqual('Healthy8 actions pending');
    });

    it('should display status and isolating', async () => {
      actionsSummary.pending_actions = {
        isolate: 1,
      };
      const { getByTestId } = render();

      await waitFor(() => {
        expect(apiMocks.responseProvider.agentPendingActionsSummary).toHaveBeenCalled();
      });

      expect(getByTestId('test').textContent).toEqual('HealthyIsolating');
    });

    it('should display status and isolating and have tooltip with other pending actions', async () => {
      actionsSummary.pending_actions = {
        isolate: 1,
        'kill-process': 1,
      };
      const { getByTestId } = render();

      await waitFor(() => {
        expect(apiMocks.responseProvider.agentPendingActionsSummary).toHaveBeenCalled();
      });

      expect(getByTestId('test').textContent).toEqual('HealthyIsolating');

      triggerTooltip();

      await waitFor(() => {
        expect(
          within(renderResult.baseElement).getByTestId('test-actionStatuses-tooltipContent')
            .textContent
        ).toEqual('Pending actions:isolate1kill-process1');
      });
    });

    it('should display status and releasing', async () => {
      actionsSummary.pending_actions = {
        unisolate: 1,
      };
      set(endpointDetails, ENDPOINT_ISOLATION_OBJ_PATH, true);
      const { getByTestId } = render();

      await waitFor(() => {
        expect(apiMocks.responseProvider.agentPendingActionsSummary).toHaveBeenCalled();
      });

      expect(getByTestId('test').textContent).toEqual('HealthyReleasing');
    });

    it('should display status and releasing and show other pending actions in tooltip', async () => {
      actionsSummary.pending_actions = {
        unisolate: 1,
        'kill-process': 1,
      };
      set(endpointDetails, ENDPOINT_ISOLATION_OBJ_PATH, true);
      const { getByTestId } = render();

      await waitFor(() => {
        expect(apiMocks.responseProvider.agentPendingActionsSummary).toHaveBeenCalled();
      });

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
      actionsSummary.pending_actions = {
        isolate: 1,
        'get-file': 2,
        execute: 6,
        'kill-process': 1,
        foo: 2,
      };
      const { getByTestId } = render();

      await waitFor(() => {
        expect(apiMocks.responseProvider.agentPendingActionsSummary).toHaveBeenCalled();
      });

      expect(getByTestId('test').textContent).toEqual('HealthyIsolating');

      triggerTooltip();

      await waitFor(() => {
        expect(
          within(renderResult.baseElement).getByTestId('test-actionStatuses-tooltipContent')
            .textContent
        ).toEqual('Pending actions:execute6foo2get-file2isolate1kill-process1');
      });
    });

    it('should still display status and isolation state if action summary api fails', async () => {
      set(endpointDetails, ENDPOINT_ISOLATION_OBJ_PATH, true);
      apiMocks.responseProvider.agentPendingActionsSummary.mockImplementation(() => {
        throw new Error('test error');
      });

      const { getByTestId } = render();

      await waitFor(() => {
        expect(apiMocks.responseProvider.agentPendingActionsSummary).toHaveBeenCalled();
      });

      expect(getByTestId('test').textContent).toEqual('HealthyIsolated');
    });

    describe('and `autoRefresh` prop is set to true', () => {
      beforeEach(() => {
        renderProps.autoRefresh = true;
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should keep actions up to date when autoRefresh is true', async () => {
        apiMocks.responseProvider.agentPendingActionsSummary.mockReturnValueOnce({
          data: [actionsSummary],
        });

        const { getByTestId } = render();

        await waitFor(() => {
          expect(apiMocks.responseProvider.agentPendingActionsSummary).toHaveBeenCalled();
        });

        expect(getByTestId('test').textContent).toEqual('Healthy');

        apiMocks.responseProvider.agentPendingActionsSummary.mockReturnValueOnce({
          data: [
            {
              ...actionsSummary,
              pending_actions: {
                'kill-process': 2,
                'running-processes': 2,
              },
            },
          ],
        });

        jest.runOnlyPendingTimers();

        await waitFor(() => {
          expect(getByTestId('test').textContent).toEqual('Healthy4 actions pending');
        });
      });
    });
  });

  describe('And when using EndpointAgentStatusById', () => {
    let renderProps: EndpointAgentStatusByIdProps;

    beforeEach(() => {
      jest.useFakeTimers();

      renderProps = {
        'data-test-subj': 'test',
        endpointAgentId: '123',
      };

      render = () => {
        renderResult = appTestContext.render(<EndpointAgentStatusById {...renderProps} />);
        return renderResult;
      };
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should display status and isolated', async () => {
      set(endpointDetails, ENDPOINT_ISOLATION_OBJ_PATH, true);
      const { getByTestId } = render();

      await waitFor(() => {
        expect(getByTestId('test').textContent).toEqual('HealthyIsolated');
      });
    });

    it('should display empty value if API call to host metadata fails', async () => {
      apiMocks.responseProvider.metadataDetails.mockImplementation(() => {
        throw new Error('test error');
      });
      const { getByTestId } = render();

      await waitFor(() => {
        expect(apiMocks.responseProvider.metadataDetails).toHaveBeenCalled();
      });

      expect(getByTestId('test').textContent).toEqual(getEmptyValue());
    });

    it('should keep agent status up to date when autoRefresh is true', async () => {
      renderProps.autoRefresh = true;
      apiMocks.responseProvider.metadataDetails.mockReturnValueOnce(endpointDetails);

      const { getByTestId } = render();

      await waitFor(() => {
        expect(getByTestId('test').textContent).toEqual('Healthy');
      });

      apiMocks.responseProvider.metadataDetails.mockReturnValueOnce(
        set(clone(endpointDetails), 'metadata.Endpoint.state.isolation', true)
      );
      jest.runOnlyPendingTimers();

      await waitFor(() => {
        expect(getByTestId('test').textContent).toEqual('HealthyIsolated');
      });
    });
  });
});
