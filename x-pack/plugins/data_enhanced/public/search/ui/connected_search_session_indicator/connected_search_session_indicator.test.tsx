/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { StubBrowserStorage } from '@kbn/test/jest';
import { render, waitFor, screen, act } from '@testing-library/react';
import { Storage } from '../../../../../../../src/plugins/kibana_utils/public/';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { createConnectedSearchSessionIndicator } from './connected_search_session_indicator';
import { BehaviorSubject } from 'rxjs';
import {
  ISessionService,
  RefreshInterval,
  SearchSessionState,
  TimefilterContract,
} from '../../../../../../../src/plugins/data/public';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { TOUR_RESTORE_STEP_KEY, TOUR_TAKING_TOO_LONG_STEP_KEY } from './search_session_tour';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';

const coreStart = coreMock.createStart();
const application = coreStart.application;
const dataStart = dataPluginMock.createStartContract();
const sessionService = dataStart.search.session as jest.Mocked<ISessionService>;
let storage: Storage;
const refreshInterval$ = new BehaviorSubject<RefreshInterval>({ value: 0, pause: true });
const timeFilter = dataStart.query.timefilter.timefilter as jest.Mocked<TimefilterContract>;
timeFilter.getRefreshIntervalUpdate$.mockImplementation(() => refreshInterval$);
timeFilter.getRefreshInterval.mockImplementation(() => refreshInterval$.getValue());

const disableSaveAfterSessionCompletesTimeout = 5 * 60 * 1000;

function Container({ children }: { children?: ReactNode }) {
  return <IntlProvider locale="en">{children}</IntlProvider>;
}

beforeEach(() => {
  storage = new Storage(new StubBrowserStorage());
  refreshInterval$.next({ value: 0, pause: true });
  sessionService.isSessionStorageReady.mockImplementation(() => true);
  sessionService.getSearchSessionIndicatorUiConfig.mockImplementation(() => ({
    isDisabled: () => ({
      disabled: false,
    }),
  }));
});

test("shouldn't show indicator in case no active search session", async () => {
  const SearchSessionIndicator = createConnectedSearchSessionIndicator({
    sessionService,
    application,
    timeFilter,
    storage,
    disableSaveAfterSessionCompletesTimeout,
  });
  const { getByTestId, container } = render(
    <Container>
      <SearchSessionIndicator />
    </Container>
  );

  // make sure `searchSessionIndicator` isn't appearing after some time (lazy-loading)
  await expect(
    waitFor(() => getByTestId('searchSessionIndicator'), { timeout: 100 })
  ).rejects.toThrow();
  expect(container).toMatchInlineSnapshot(`
    <div>
      <div
        class="kbnRedirectCrossAppLinks"
      />
    </div>
  `);
});

test("shouldn't show indicator in case app hasn't opt-in", async () => {
  const SearchSessionIndicator = createConnectedSearchSessionIndicator({
    sessionService,
    application,
    timeFilter,
    storage,
    disableSaveAfterSessionCompletesTimeout,
  });
  const { getByTestId, container } = render(
    <Container>
      <SearchSessionIndicator />
    </Container>
  );
  sessionService.isSessionStorageReady.mockImplementation(() => false);

  // make sure `searchSessionIndicator` isn't appearing after some time (lazy-loading)
  await expect(
    waitFor(() => getByTestId('searchSessionIndicator'), { timeout: 100 })
  ).rejects.toThrow();
  expect(container).toMatchInlineSnapshot(`
    <div>
      <div
        class="kbnRedirectCrossAppLinks"
      />
    </div>
  `);
});

test('should show indicator in case there is an active search session', async () => {
  const state$ = new BehaviorSubject(SearchSessionState.Loading);
  const SearchSessionIndicator = createConnectedSearchSessionIndicator({
    sessionService: { ...sessionService, state$ },
    application,
    timeFilter,
    storage,
    disableSaveAfterSessionCompletesTimeout,
  });
  const { getByTestId } = render(
    <Container>
      <SearchSessionIndicator />
    </Container>
  );

  await waitFor(() => getByTestId('searchSessionIndicator'));
});

test('should be disabled in case uiConfig says so ', async () => {
  const state$ = new BehaviorSubject(SearchSessionState.Loading);
  sessionService.getSearchSessionIndicatorUiConfig.mockImplementation(() => ({
    isDisabled: () => ({
      disabled: true,
      reasonText: 'reason',
    }),
  }));
  const SearchSessionIndicator = createConnectedSearchSessionIndicator({
    sessionService: { ...sessionService, state$ },
    application,
    timeFilter,
    storage,
    disableSaveAfterSessionCompletesTimeout,
  });

  render(
    <Container>
      <SearchSessionIndicator />
    </Container>
  );

  await waitFor(() => screen.getByTestId('searchSessionIndicator'));

  await userEvent.click(screen.getByLabelText('Search session loading'));

  expect(screen.getByRole('button', { name: 'Save session' })).toBeDisabled();
});

test('should be disabled in case not enough permissions', async () => {
  const state$ = new BehaviorSubject(SearchSessionState.Completed);
  const SearchSessionIndicator = createConnectedSearchSessionIndicator({
    sessionService: { ...sessionService, state$, hasAccess: () => false },
    application,
    timeFilter,
    storage,
    disableSaveAfterSessionCompletesTimeout,
  });

  render(
    <Container>
      <SearchSessionIndicator />
    </Container>
  );

  await waitFor(() => screen.getByTestId('searchSessionIndicator'));

  await userEvent.click(screen.getByLabelText('Search session complete'));

  expect(screen.getByRole('button', { name: 'Save session' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Manage sessions' })).toBeDisabled();
});

test('should be disabled during auto-refresh', async () => {
  const state$ = new BehaviorSubject(SearchSessionState.Loading);

  const SearchSessionIndicator = createConnectedSearchSessionIndicator({
    sessionService: { ...sessionService, state$ },
    application,
    timeFilter,
    storage,
    disableSaveAfterSessionCompletesTimeout,
  });

  render(
    <Container>
      <SearchSessionIndicator />
    </Container>
  );

  await waitFor(() => screen.getByTestId('searchSessionIndicator'));

  await userEvent.click(screen.getByLabelText('Search session loading'));

  expect(screen.getByRole('button', { name: 'Save session' })).not.toBeDisabled();

  act(() => {
    refreshInterval$.next({ value: 0, pause: false });
  });

  expect(screen.getByRole('button', { name: 'Save session' })).toBeDisabled();
});

describe('Completed inactivity', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  test('save should be disabled after completed and timeout', async () => {
    const state$ = new BehaviorSubject(SearchSessionState.Loading);

    const SearchSessionIndicator = createConnectedSearchSessionIndicator({
      sessionService: { ...sessionService, state$ },
      application,
      timeFilter,
      storage,
      disableSaveAfterSessionCompletesTimeout,
    });

    render(
      <Container>
        <SearchSessionIndicator />
      </Container>
    );

    await waitFor(() => screen.getByTestId('searchSessionIndicator'));

    await userEvent.click(screen.getByLabelText('Search session loading'));

    expect(screen.getByRole('button', { name: 'Save session' })).not.toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(screen.getByRole('button', { name: 'Save session' })).not.toBeDisabled();

    act(() => {
      state$.next(SearchSessionState.Completed);
    });

    expect(screen.getByRole('button', { name: 'Save session' })).not.toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(2.5 * 60 * 1000);
    });

    expect(screen.getByRole('button', { name: 'Save session' })).not.toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(2.5 * 60 * 1000);
    });

    expect(screen.getByRole('button', { name: 'Save session' })).toBeDisabled();
  });
});

describe('tour steps', () => {
  describe('loading state', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    test('shows tour step on slow loading with delay', async () => {
      const state$ = new BehaviorSubject(SearchSessionState.Loading);
      const SearchSessionIndicator = createConnectedSearchSessionIndicator({
        sessionService: { ...sessionService, state$ },
        application,
        timeFilter,
        storage,
        disableSaveAfterSessionCompletesTimeout,
      });
      const rendered = render(
        <Container>
          <SearchSessionIndicator />
        </Container>
      );

      await waitFor(() => rendered.getByTestId('searchSessionIndicator'));

      expect(() => screen.getByTestId('searchSessionIndicatorPopoverContainer')).toThrow();

      act(() => {
        jest.advanceTimersByTime(10001);
      });

      expect(screen.getByTestId('searchSessionIndicatorPopoverContainer')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(5000);
        state$.next(SearchSessionState.Completed);
      });

      // Open tour should stay on screen after state change
      expect(screen.getByTestId('searchSessionIndicatorPopoverContainer')).toBeInTheDocument();

      expect(storage.get(TOUR_RESTORE_STEP_KEY)).toBeFalsy();
      expect(storage.get(TOUR_TAKING_TOO_LONG_STEP_KEY)).toBeTruthy();
    });

    test("doesn't show tour step if state changed before delay", async () => {
      const state$ = new BehaviorSubject(SearchSessionState.Loading);
      const SearchSessionIndicator = createConnectedSearchSessionIndicator({
        sessionService: { ...sessionService, state$ },
        application,
        timeFilter,
        storage,
        disableSaveAfterSessionCompletesTimeout,
      });
      const rendered = render(
        <Container>
          <SearchSessionIndicator />
        </Container>
      );

      const searchSessionIndicator = await rendered.findByTestId('searchSessionIndicator');
      expect(searchSessionIndicator).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(3000);
        state$.next(SearchSessionState.Completed);
        jest.advanceTimersByTime(3000);
      });

      expect(rendered.queryByTestId('searchSessionIndicatorPopoverContainer')).toBeFalsy();

      expect(storage.get(TOUR_RESTORE_STEP_KEY)).toBeFalsy();
      expect(storage.get(TOUR_TAKING_TOO_LONG_STEP_KEY)).toBeFalsy();
    });
  });

  test('shows tour step for restored', async () => {
    const state$ = new BehaviorSubject(SearchSessionState.Restored);
    const SearchSessionIndicator = createConnectedSearchSessionIndicator({
      sessionService: { ...sessionService, state$ },
      application,
      timeFilter,
      storage,
      disableSaveAfterSessionCompletesTimeout,
    });
    const rendered = render(
      <Container>
        <SearchSessionIndicator />
      </Container>
    );

    await waitFor(() => rendered.getByTestId('searchSessionIndicator'));
    expect(screen.getByTestId('searchSessionIndicatorPopoverContainer')).toBeInTheDocument();

    expect(storage.get(TOUR_RESTORE_STEP_KEY)).toBeTruthy();
    expect(storage.get(TOUR_TAKING_TOO_LONG_STEP_KEY)).toBeTruthy();
  });

  test("doesn't show tour for irrelevant state", async () => {
    const state$ = new BehaviorSubject(SearchSessionState.Completed);
    const SearchSessionIndicator = createConnectedSearchSessionIndicator({
      sessionService: { ...sessionService, state$ },
      application,
      timeFilter,
      storage,
      disableSaveAfterSessionCompletesTimeout,
    });
    const rendered = render(
      <Container>
        <SearchSessionIndicator />
      </Container>
    );

    await waitFor(() => rendered.getByTestId('searchSessionIndicator'));

    expect(rendered.queryByTestId('searchSessionIndicatorPopoverContainer')).toBeFalsy();

    expect(storage.get(TOUR_RESTORE_STEP_KEY)).toBeFalsy();
    expect(storage.get(TOUR_TAKING_TOO_LONG_STEP_KEY)).toBeFalsy();
  });
});
