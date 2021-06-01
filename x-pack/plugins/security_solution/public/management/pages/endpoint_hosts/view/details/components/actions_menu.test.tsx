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
  let waitForAction: AppContextTestRender['middlewareSpy']['waitForAction'];
  let history: AppContextTestRender['history'];
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let httpMocks: ReturnType<typeof endpointPageHttpMock>;

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    (useKibana as jest.Mock).mockReturnValue({ services: mockedContext.startServices });
    ({ history } = mockedContext);
    waitForAction = mockedContext.middlewareSpy.waitForAction;
    httpMocks = endpointPageHttpMock(mockedContext.coreStart.http);

    act(() => {
      history.push('/endpoints?selected_endpoint=5fe11314-678c-413e-87a2-b4a3461878ee');
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
    beforeEach(() => {
      const endpointHost = httpMocks.responseProvider.metadataDetails();
      // Safe to mutate this mocked data
      // @ts-ignore
      endpointHost.metadata.Endpoint.state.isolation = false;
      httpMocks.responseProvider.metadataDetails.mockReturnValue(endpointHost);
    });

    it.each([
      ['isolateLink', 'Isolate host'],
      ['hostLink', 'View host details'],
      ['agentPolicyLink', 'View agent policy'],
      ['agentDetailsLink', 'View agent details'],
    ])('should display %s actions', async (dataTestSubj) => {
      await render();
      expect(renderResult.getByTestId(dataTestSubj)).not.toBeNull();
    });

    it('should navigate via router', () => {
      //
    });
  });

  describe('and endpoint host is isolated', () => {
    it.todo('should display Unisolate action');

    it.todo('should navigate via router when unisolate is clicked');
  });
});
