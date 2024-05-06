/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import React from 'react';
import {
  TEST_PROCESS_INDEX,
  TEST_SESSION_START_TIME,
} from '../../../common/mocks/constants/session_view_process.mock';
import { sessionViewProcessEventsMock } from '../../../common/mocks/responses/session_view_process_events.mock';
import { sessionViewProcessEventsMergedMock } from '../../../common/mocks/responses/session_view_process_events_merged.mock';
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

  beforeAll(() => {
    // https://stackoverflow.com/questions/39830580/jest-test-fails-typeerror-window-matchmedia-is-not-a-function
    // xtermjs is using window.matchMedia, which isn't mocked in jest by default.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockedApi = mockedContext.coreStart.http.get;
    render = () =>
      (renderResult = mockedContext.render(
        <SessionView
          index={TEST_PROCESS_INDEX}
          sessionStartTime={TEST_SESSION_START_TIME}
          sessionEntityId="test-entity-id"
          trackEvent={jest.fn()}
        />
      ));
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

        // see if loader is present
        await waitFor(() => {
          expect(renderResult.getByTestId('sectionLoading')).toBeTruthy();
        });

        // release the request
        releaseApiResponse!(mockedApi);

        //  check the loader is gone
        await waitForElementToBeRemoved(renderResult.getByTestId('sectionLoading'));
      });

      it('should show the Empty message', async () => {
        render();
        await waitFor(() => {
          expect(
            renderResult.getByTestId('sessionView:sessionViewProcessEventsEmpty')
          ).toBeTruthy();
        });
      });

      it('should not display the search bar', async () => {
        render();
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

        // see if loader is present
        await waitFor(() => {
          expect(renderResult.getByTestId('sectionLoading')).toBeTruthy();
        });

        // release the request
        releaseApiResponse!(mockedApi);

        //  check the loader is gone
        await waitForElementToBeRemoved(renderResult.getByTestId('sectionLoading'));
      });

      it('should display the search bar', async () => {
        render();

        await waitFor(() => {
          expect(
            renderResult.getByTestId('sessionView:sessionViewProcessEventsSearch')
          ).toBeTruthy();
        });
      });

      it('should show items on the list', async () => {
        render();

        await waitFor(() => {
          expect(renderResult.getAllByTestId('sessionView:processTreeNode')).toBeTruthy();
        });
      });

      it('should toggle detail panel visibilty when detail button clicked', async () => {
        render();

        await waitFor(() => {
          expect(renderResult.getByTestId('sessionView:sessionViewDetailPanelToggle')).toBeTruthy();
        });

        userEvent.click(renderResult.getByTestId('sessionView:sessionViewDetailPanelToggle'));
        expect(renderResult.getByText('Process')).toBeTruthy();
        expect(renderResult.getByText('Metadata')).toBeTruthy();
        expect(renderResult.getByText('Alerts')).toBeTruthy();
      });

      it('should render session view options button and its options when clicked', async () => {
        render();

        await waitFor(() => {
          expect(renderResult.getByTestId('sessionView:sessionViewOptionButton')).toBeTruthy();
        });

        userEvent.click(renderResult.getByTestId('sessionView:sessionViewOptionButton'));
        expect(renderResult.getByText('Display options')).toBeTruthy();
        expect(renderResult.getByText('Timestamp')).toBeTruthy();
        expect(renderResult.getByText('Verbose mode')).toBeTruthy();
      });

      it('should show refresh button', async () => {
        render();

        await waitFor(() => {
          expect(renderResult.getAllByTestId('sessionView:sessionViewRefreshButton')).toBeTruthy();
        });
      });
    });

    describe('And data contains merged process events', () => {
      beforeEach(async () => {
        mockedApi.mockResolvedValue(sessionViewProcessEventsMergedMock);
      });

      it('should show items on the list', async () => {
        render();

        await waitFor(() => {
          expect(renderResult.getAllByTestId('sessionView:processTreeNode')).toBeTruthy();
        });
      });
    });

    describe('TTYPlayer button', () => {
      it('should show tty player button, if session has output', async () => {
        mockedApi.mockImplementation(async (path: any) => {
          if (path === PROCESS_EVENTS_ROUTE) {
            return sessionViewProcessEventsMock;
          } else if (path === GET_TOTAL_IO_BYTES_ROUTE) {
            return { total: 1024 };
          }

          return { total: 0 };
        });

        render();

        await waitFor(() => {
          expect(renderResult.queryByTestId('sessionView:TTYPlayerToggle')).toBeTruthy();
        });
      });
    });
  });
});
