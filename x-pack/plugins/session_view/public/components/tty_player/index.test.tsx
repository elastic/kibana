/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { sessionViewIOEventsMock } from '../../../common/mocks/responses/session_view_io_events.mock';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { TTYPlayerDeps, TTYPlayer } from '.';

describe('TTYPlayer component', () => {
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
      sessionEntityId: mockSessionEntityId,
      onClose: jest.fn(),
      isFullscreen: false,
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
  });
});
