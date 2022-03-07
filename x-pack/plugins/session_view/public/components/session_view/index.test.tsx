/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import { sessionViewProcessEventsMock } from '../../../common/mocks/responses/session_view_process_events.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { SessionView } from './index';
import userEvent from '@testing-library/user-event';

describe('SessionView component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let mockedApi: AppContextTestRender['coreStart']['http']['get'];

  const waitForApiCall = () => waitFor(() => expect(mockedApi).toHaveBeenCalled());

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockedApi = mockedContext.coreStart.http.get;
    render = () =>
      (renderResult = mockedContext.render(<SessionView sessionEntityId="test-entity-id" />));
  });

  describe('When SessionView is mounted', () => {
    describe('And no data exists', () => {
      beforeEach(async () => {
        mockedApi.mockResolvedValue({
          events: [],
        });
      });

      it('should show the Empty message', async () => {
        render();
        await waitForApiCall();
        expect(renderResult.getByTestId('sessionView:sessionViewProcessEventsEmpty')).toBeTruthy();
      });

      it('should not display the search bar', async () => {
        render();
        await waitForApiCall();
        expect(
          renderResult.queryByTestId('sessionView:sessionViewProcessEventsSearch')
        ).toBeFalsy();
      });
    });

    describe('And data exists', () => {
      beforeEach(async () => {
        mockedApi.mockResolvedValue(sessionViewProcessEventsMock);
      });

      it('should show loading indicator while retrieving data and hide it when it gets it', async () => {
        let releaseApiResponse: (value?: unknown) => void;

        // make the request wait
        mockedApi.mockReturnValue(new Promise((resolve) => (releaseApiResponse = resolve)));
        render();
        await waitForApiCall();

        // see if loader is present
        expect(renderResult.getByText('Loading session…')).toBeTruthy();

        // release the request
        releaseApiResponse!(mockedApi);

        //  check the loader is gone
        await waitForElementToBeRemoved(renderResult.getByText('Loading session…'));
      });

      it('should display the search bar', async () => {
        render();
        await waitForApiCall();
        expect(renderResult.getByTestId('sessionView:sessionViewProcessEventsSearch')).toBeTruthy();
      });

      it('should show items on the list, and auto selects session leader', async () => {
        render();
        await waitForApiCall();

        expect(renderResult.getAllByTestId('sessionView:processTreeNode')).toBeTruthy();

        const selectionArea = renderResult.queryByTestId('sessionView:processTreeSelectionArea');

        expect(selectionArea?.parentElement?.getAttribute('data-id')).toEqual('test-entity-id');
      });

      it('should toggle detail panel visibilty when detail button clicked', async () => {
        render();
        await waitForApiCall();

        userEvent.click(renderResult.getByTestId('sessionViewDetailPanelToggle'));
        expect(renderResult.getByText('Process')).toBeTruthy();
        expect(renderResult.getByText('Host')).toBeTruthy();
        expect(renderResult.getByText('Alerts')).toBeTruthy();
      });
    });
  });
});
