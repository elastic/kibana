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
import type {
  EndpointPendingActions,
  HostInfoInterface,
} from '../../../../../common/endpoint/types';
import { HostStatus } from '../../../../../common/endpoint/types';
import React from 'react';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import { composeHttpHandlerMocks } from '../../../mock/endpoint/http_handler_mock_factory';
import type { EndpointMetadataHttpMocksInterface } from '../../../../management/pages/endpoint_hosts/mocks';
import { endpointMetadataHttpMocks } from '../../../../management/pages/endpoint_hosts/mocks';
import type { ResponseActionsHttpMocksInterface } from '../../../../management/mocks/response_actions_http_mocks';
import { responseActionsHttpMocks } from '../../../../management/mocks/response_actions_http_mocks';
import { waitFor } from '@testing-library/react';

type AgentStatusApiMocksInterface = EndpointMetadataHttpMocksInterface &
  ResponseActionsHttpMocksInterface;

// API mocks composed from the endpoint metadata API mock and the response actions API mocks
const agentStatusApiMocks = composeHttpHandlerMocks<AgentStatusApiMocksInterface>([
  endpointMetadataHttpMocks,
  responseActionsHttpMocks,
]);

describe('When showing Endpoint Agent Status', () => {
  let appTestContext: AppContextTestRender;
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let endpointDetails: HostInfoInterface;
  let actionsSummary: EndpointPendingActions;
  let apiMocks: ReturnType<typeof agentStatusApiMocks>;

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
      endpointDetails.metadata.Endpoint.state = { isolation: true };
      const { getByTestId } = render();

      expect(getByTestId('test').textContent).toEqual('HealthyIsolated');
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

    it('should display status and releasing', async () => {
      actionsSummary.pending_actions = {
        unisolate: 1,
      };
      endpointDetails.metadata.Endpoint.state = { isolation: true };
      const { getByTestId } = render();

      await waitFor(() => {
        expect(apiMocks.responseProvider.agentPendingActionsSummary).toHaveBeenCalled();
      });

      expect(getByTestId('test').textContent).toEqual('HealthyReleasing');
    });

    it.todo('should show individual action count in tooltip');

    it.todo('should should keep actions up to date when autoRefresh is true');

    it.todo('should still display status if action summary api fails');
  });

  describe('And when using EndpointAgentStatusById', () => {
    it.todo('should display status and isolated');

    it.todo('should keep agent status up to date when autoRefresh is true');

    it.todo('should display empty value if API call to host metadata fails');
  });
});
