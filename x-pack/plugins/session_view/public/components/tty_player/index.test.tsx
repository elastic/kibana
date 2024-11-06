/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import {
  TEST_PROCESS_INDEX,
  TEST_SESSION_START_TIME,
} from '../../../common/mocks/constants/session_view_process.mock';
import { sessionViewIOEventsMock } from '../../../common/mocks/responses/session_view_io_events.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { TTYPlayerDeps, TTYPlayer } from '.';
import userEvent from '@testing-library/user-event';

describe('TTYPlayer component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let mockedApi: AppContextTestRender['coreStart']['http']['get'];
  let props: TTYPlayerDeps;

  const waitForApiCall = () => waitFor(() => expect(mockedApi).toHaveBeenCalled());

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockedApi = mockedContext.coreStart.http.get;
    mockedApi.mockResolvedValue(sessionViewIOEventsMock);

    const mockSessionEntityId =
      sessionViewIOEventsMock?.events?.[0]?._source?.process?.entry_leader?.entity_id;

    props = {
      show: true,
      index: TEST_PROCESS_INDEX,
      sessionEntityId: mockSessionEntityId,
      sessionStartTime: TEST_SESSION_START_TIME,
      onClose: jest.fn(),
      onJumpToEvent: jest.fn(),
      isFullscreen: false,
      trackEvent: jest.fn(),
    };
  });

  describe('When TTYPlayer is mounted', () => {
    it('should have a search bar', () => {
      renderResult = mockedContext.render(<TTYPlayer {...props} />);
      expect(renderResult.queryByTestId('sessionView:TTYSearch')).toBeTruthy();
    });
    it('should render container for xtermjs', () => {
      renderResult = mockedContext.render(<TTYPlayer {...props} />);
      expect(renderResult.queryByTestId('sessionView:TTYPlayer')).toBeTruthy();
    });
    it('should have player controls', () => {
      renderResult = mockedContext.render(<TTYPlayer {...props} />);
      expect(renderResult.queryByTestId('sessionView:TTYPlayerControls')).toBeTruthy();
    });
    it('should have rendered an instance of xtermjs', () => {
      renderResult = mockedContext.render(<TTYPlayer {...props} />);
      expect(
        renderResult.queryByTestId('sessionView:TTYPlayer')?.querySelector('.terminal.xterm')
      ).toBeTruthy();
    });
    it('should have fetched io events', async () => {
      renderResult = mockedContext.render(<TTYPlayer {...props} />);

      await waitForApiCall();
    });

    it('renders a message warning when max_bytes exceeded', async () => {
      renderResult = mockedContext.render(<TTYPlayer {...props} />);

      await waitForApiCall();
      await new Promise((r) => setTimeout(r, 10));

      const seekToEndBtn = renderResult.getByTestId('sessionView:TTYPlayerControlsEnd');

      await userEvent.click(seekToEndBtn);

      waitFor(() => expect(renderResult.queryAllByText('Data limit reached')).toHaveLength(1));
      expect(renderResult.queryByText('[ VIEW POLICIES ]')).toBeFalsy();
    });

    it('renders a message warning when max_bytes exceeded with link to policies page', async () => {
      renderResult = mockedContext.render(<TTYPlayer {...props} canReadPolicyManagement={true} />);

      await waitForApiCall();
      await new Promise((r) => setTimeout(r, 10));

      const seekToEndBtn = renderResult.getByTestId('sessionView:TTYPlayerControlsEnd');

      await userEvent.click(seekToEndBtn);

      waitFor(() => expect(renderResult.queryAllByText('[ VIEW POLICIES ]')).toHaveLength(1));
    });
  });
});
