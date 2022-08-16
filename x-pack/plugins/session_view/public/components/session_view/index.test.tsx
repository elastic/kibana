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
import { SessionView } from '.';
import userEvent from '@testing-library/user-event';
import { useDateFormat } from '../../hooks';
import { GET_TOTAL_IO_BYTES_ROUTE, PROCESS_EVENTS_ROUTE } from '../../../common/constants';

jest.mock('../../hooks/use_date_format');
const mockUseDateFormat = useDateFormat as jest.Mock;

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
    mockUseDateFormat.mockImplementation(() => 'MMM D, YYYY @ HH:mm:ss.SSS');
  });

  describe('When SessionView is mounted', () => {
    describe('And no data exists', () => {
      beforeEach(async () => {
        mockedApi.mockResolvedValue({
          events: [],
        });
      });

      it('should show loading state while retrieving empty data and hide it when settled', async () => {
        let releaseApiResponse: (value?: unknown) => void;

        // make the request wait
        mockedApi.mockReturnValue(new Promise((resolve) => (releaseApiResponse = resolve)));
        render();
        await waitForApiCall();

        // see if loader is present
        expect(renderResult.getByTestId('sectionLoading')).toBeTruthy();

        // release the request
        releaseApiResponse!(mockedApi);

        //  check the loader is gone
        await waitForElementToBeRemoved(renderResult.getByTestId('sectionLoading'));
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

      it('should show loading state while retrieving data and hide it when settled', async () => {
        let releaseApiResponse: (value?: unknown) => void;

        // make the request wait
        mockedApi.mockReturnValue(new Promise((resolve) => (releaseApiResponse = resolve)));
        render();
        await waitForApiCall();

        // see if loader is present
        expect(renderResult.getByTestId('sectionLoading')).toBeTruthy();

        // release the request
        releaseApiResponse!(mockedApi);

        //  check the loader is gone
        await waitForElementToBeRemoved(renderResult.getByTestId('sectionLoading'));
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
      });

      it('should toggle detail panel visibilty when detail button clicked', async () => {
        render();
        await waitForApiCall();

        userEvent.click(renderResult.getByTestId('sessionView:sessionViewDetailPanelToggle'));
        expect(renderResult.getByText('Process')).toBeTruthy();
        expect(renderResult.getByText('Metadata')).toBeTruthy();
        expect(renderResult.getByText('Alerts')).toBeTruthy();
      });

      it('should render session view options button and its options when clicked', async () => {
        render();
        await waitForApiCall();
        userEvent.click(renderResult.getByTestId('sessionView:sessionViewOptionButton'));
        expect(renderResult.getByText('Display options')).toBeTruthy();
        expect(renderResult.getByText('Timestamp')).toBeTruthy();
        expect(renderResult.getByText('Verbose mode')).toBeTruthy();
      });

      it('should show refresh button', async () => {
        render();
        await waitForApiCall();

        expect(renderResult.getAllByTestId('sessionView:sessionViewRefreshButton')).toBeTruthy();
      });
    });

    describe('TTYPlayer button', () => {
      it('should show tty player button, if session has output', async () => {
        mockedApi.mockImplementation(async (path: any) => {
          if (path === PROCESS_EVENTS_ROUTE) {
            return sessionViewProcessEventsMock;
          } else if (path === GET_TOTAL_IO_BYTES_ROUTE) {
            return 1024;
          }

          return 0;
        });

        render();
        await waitForApiCall();

        expect(renderResult.queryByTestId('sessionView:TTYPlayerToggle')).toBeTruthy();
      });

      it('should NOT show tty player button, if session has no output', async () => {
        mockedApi.mockImplementation(async (options) => {
          // for some reason the typescript interface for options says its an object with a field called path.
          // in reality options is a string (which equals the path...)
          const path = String(options);

          if (path === PROCESS_EVENTS_ROUTE) {
            return sessionViewProcessEventsMock;
          } else if (path === GET_TOTAL_IO_BYTES_ROUTE) {
            return 0;
          }

          return 0;
        });

        render();
        await waitForApiCall();

        expect(renderResult.queryByTestId('sessionView:TTYPlayerToggle')).toBeFalsy();
      });
    });
  });
});
