/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { useKibana } from '../../../../../../common/lib/kibana';
import { ActionsMenu } from './actions_menu';
import React from 'react';
import { act } from '@testing-library/react';
import { endpointPageHttpMock } from '../../../mocks';
import { fireEvent } from '@testing-library/dom';

jest.mock('../../../../../../common/lib/kibana');

describe('When using the Endpoint Details Actions Menu', () => {
  let render: () => Promise<ReturnType<AppContextTestRender['render']>>;
  let coreStart: AppContextTestRender['coreStart'];
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let httpMocks: ReturnType<typeof endpointPageHttpMock>;

  const setEndpointMetadataResponse = (isolation: boolean = false) => {
    const endpointHost = httpMocks.responseProvider.metadataDetails();
    // Safe to mutate this mocked data
    // @ts-ignore
    endpointHost.metadata.Endpoint.state.isolation = isolation;
    httpMocks.responseProvider.metadataDetails.mockReturnValue(endpointHost);
  };

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    (useKibana as jest.Mock).mockReturnValue({ services: mockedContext.startServices });
    coreStart = mockedContext.coreStart;
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    httpMocks = endpointPageHttpMock(mockedContext.coreStart.http);

    act(() => {
      mockedContext.history.push(
        '/endpoints?selected_endpoint=5fe11314-678c-413e-87a2-b4a3461878ee'
      );
    });

    render = async () => {
      renderResult = mockedContext.render(<ActionsMenu />);

      await act(async () => {
        await waitForAction('serverReturnedEndpointDetails');
      });

      act(() => {
        fireEvent.click(renderResult.getByTestId('endpointDetailsActionsButton'));
      });

      return renderResult;
    };
  });

  describe('and endpoint host is NOT isolated', () => {
    beforeEach(() => setEndpointMetadataResponse());

    it.each([
      ['Isolate host', 'isolateLink'],
      ['View host details', 'hostLink'],
      ['View agent policy', 'agentPolicyLink'],
      ['View agent details', 'agentDetailsLink'],
      ['Reassign agent policy', 'agentPolicyReassignLink'],
    ])('should display %s action', async (_, dataTestSubj) => {
      await render();
      expect(renderResult.getByTestId(dataTestSubj)).not.toBeNull();
    });

    it.each([
      ['Isolate host', 'isolateLink'],
      ['View host details', 'hostLink'],
      ['View agent policy', 'agentPolicyLink'],
      ['View agent details', 'agentDetailsLink'],
      ['Reassign agent policy', 'agentPolicyReassignLink'],
    ])(
      'should navigate via kibana `navigateToApp()` when %s is clicked',
      async (_, dataTestSubj) => {
        await render();
        act(() => {
          fireEvent.click(renderResult.getByTestId(dataTestSubj));
        });

        expect(coreStart.application.navigateToApp).toHaveBeenCalled();
      }
    );
  });

  describe('and endpoint host is isolated', () => {
    beforeEach(() => setEndpointMetadataResponse(true));

    it('should display Unisolate action', async () => {
      await render();
      expect(renderResult.getByTestId('unIsolateLink')).not.toBeNull();
    });

    it('should navigate via router when unisolate is clicked', async () => {
      await render();
      act(() => {
        fireEvent.click(renderResult.getByTestId('unIsolateLink'));
      });

      expect(coreStart.application.navigateToApp).toHaveBeenCalled();
    });
  });
});
