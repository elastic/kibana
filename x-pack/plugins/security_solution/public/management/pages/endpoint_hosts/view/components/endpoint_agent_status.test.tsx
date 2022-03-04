/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../common/mock/endpoint';
import { endpointPageHttpMock } from '../../mocks';
import { act } from '@testing-library/react';
import { EndpointAgentStatus, EndpointAgentStatusProps } from './endpoint_agent_status';
import { HostMetadata, HostStatus } from '../../../../../../common/endpoint/types';
import { isLoadedResourceState } from '../../../../state';
import { KibanaServices } from '../../../../../common/lib/kibana';

jest.mock('../../../../../common/lib/kibana');

describe('When using the EndpointAgentStatus component', () => {
  let render: (
    props: EndpointAgentStatusProps
  ) => Promise<ReturnType<AppContextTestRender['render']>>;
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let httpMocks: ReturnType<typeof endpointPageHttpMock>;
  let endpointMeta: HostMetadata;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    (KibanaServices.get as jest.Mock).mockReturnValue(mockedContext.startServices);
    httpMocks = endpointPageHttpMock(mockedContext.coreStart.http);
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    endpointMeta = httpMocks.responseProvider.metadataList().data[0].metadata;
    render = async (props: EndpointAgentStatusProps) => {
      renderResult = mockedContext.render(<EndpointAgentStatus {...props} />);
      return renderResult;
    };

    act(() => {
      mockedContext.history.push('/administration/endpoints');
    });
  });

  it.each([
    ['Healthy', 'healthy'],
    ['Unhealthy', 'unhealthy'],
    ['Updating', 'updating'],
    ['Offline', 'offline'],
    ['Inactive', 'inactive'],
    ['Unhealthy', 'someUnknownValueHere'],
  ])('should show agent status of %s', async (expectedLabel, hostStatus) => {
    await render({ hostStatus: hostStatus as HostStatus, endpointMetadata: endpointMeta });
    expect(renderResult.getByTestId('rowHostStatus').textContent).toEqual(expectedLabel);
  });

  // FIXME: un-skip test once Islation pending statuses are supported
  describe.skip('and host is isolated or pending isolation', () => {
    beforeEach(async () => {
      // Ensure pending action api sets pending action for the test endpoint metadata
      const pendingActionsResponseProvider =
        httpMocks.responseProvider.pendingActions.getMockImplementation();
      httpMocks.responseProvider.pendingActions.mockImplementation((...args) => {
        const response = pendingActionsResponseProvider!(...args);
        response.data.some((pendingAction) => {
          if (pendingAction.agent_id === endpointMeta.elastic.agent.id) {
            pendingAction.pending_actions.isolate = 1;
            return true;
          }
          return false;
        });
        return response;
      });

      const loadingPendingActions = waitForAction('endpointPendingActionsStateChanged', {
        validate: (action) => isLoadedResourceState(action.payload),
      });

      await render({ hostStatus: HostStatus.HEALTHY, endpointMetadata: endpointMeta });
      await loadingPendingActions;
    });

    it('should show host pending action', () => {
      expect(renderResult.getByTestId('rowIsolationStatus').textContent).toEqual('Isolating');
    });
  });
});
