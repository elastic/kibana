/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StubBrowserStorage } from '@kbn/test/jest';
import { render, waitFor, screen, act, fireEvent } from '@testing-library/react';
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
import { Storage } from '../../../../../../../src/plugins/kibana_utils/public/';
import { TOUR_MESSAGES } from './search_session_indicator_tour_content';

const coreStart = coreMock.createStart();
const dataStart = dataPluginMock.createStartContract();
const sessionService = dataStart.search.session as jest.Mocked<ISessionService>;
let storage: Storage;

const refreshInterval$ = new BehaviorSubject<RefreshInterval>({ value: 0, pause: true });
const timeFilter = dataStart.query.timefilter.timefilter as jest.Mocked<TimefilterContract>;
timeFilter.getRefreshIntervalUpdate$.mockImplementation(() => refreshInterval$);
timeFilter.getRefreshInterval.mockImplementation(() => refreshInterval$.getValue());

beforeEach(() => {
  storage = new Storage(new StubBrowserStorage());
  refreshInterval$.next({ value: 0, pause: true });
});

test("shouldn't show indicator in case no active search session", async () => {
  const SearchSessionIndicator = createConnectedSearchSessionIndicator({
    sessionService,
    application: coreStart.application,
    timeFilter,
    storage,
  });
  const { getByTestId, container } = render(<SearchSessionIndicator />);

  // make sure `searchSessionIndicator` isn't appearing after some time (lazy-loading)
  await expect(
    waitFor(() => getByTestId('searchSessionIndicator'), { timeout: 100 })
  ).rejects.toThrow();
  expect(container).toMatchInlineSnapshot(`<div />`);
});

test('should show indicator in case there is an active search session', async () => {
  const state$ = new BehaviorSubject(SearchSessionState.Loading);
  const SearchSessionIndicator = createConnectedSearchSessionIndicator({
    sessionService: { ...sessionService, state$ },
    application: coreStart.application,
    timeFilter,
    storage,
  });
  const { getByTestId } = render(<SearchSessionIndicator />);

  await waitFor(() => getByTestId('searchSessionIndicator'));
});

test('should be disabled when permissions are off', async () => {
  const state$ = new BehaviorSubject(SearchSessionState.Loading);
  coreStart.application.currentAppId$ = new BehaviorSubject('discover');
  (coreStart.application.capabilities as any) = {
    discover: {
      storeSearchSession: false,
    },
  };
  const SearchSessionIndicator = createConnectedSearchSessionIndicator({
    sessionService: { ...sessionService, state$ },
    application: coreStart.application,
    timeFilter,
    storage,
  });

  render(<SearchSessionIndicator />);

  await waitFor(() => screen.getByTestId('searchSessionIndicator'));

  expect(screen.getByTestId('searchSessionIndicator').querySelector('button')).toBeDisabled();
});

test('should be disabled during auto-refresh', async () => {
  const state$ = new BehaviorSubject(SearchSessionState.Loading);
  coreStart.application.currentAppId$ = new BehaviorSubject('discover');
  (coreStart.application.capabilities as any) = {
    discover: {
      storeSearchSession: true,
    },
  };
  const SearchSessionIndicator = createConnectedSearchSessionIndicator({
    sessionService: { ...sessionService, state$ },
    application: coreStart.application,
    timeFilter,
    storage,
  });

  render(<SearchSessionIndicator />);

  await waitFor(() => screen.getByTestId('searchSessionIndicator'));

  expect(screen.getByTestId('searchSessionIndicator').querySelector('button')).not.toBeDisabled();

  act(() => {
    refreshInterval$.next({ value: 0, pause: false });
  });

  expect(screen.getByTestId('searchSessionIndicator').querySelector('button')).toBeDisabled();
});

describe('tour steps', () => {
  describe('loading state', () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    test('Shows tour step on loading state with delay', async () => {
      const state$ = new BehaviorSubject(SearchSessionState.Loading);
      const SearchSessionIndicator = createConnectedSearchSessionIndicator({
        sessionService: { ...sessionService, state$ },
        application: coreStart.application,
        timeFilter,
        storage,
      });
      const rendered = render(<SearchSessionIndicator />);

      await waitFor(() => rendered.getByTestId('searchSessionIndicator'));

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(rendered.queryByTestId('searchSessionIndicatorTour')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(5000);
        state$.next(SearchSessionState.Completed);
      });

      // Open tour should stay on screen after state change
      expect(rendered.queryByTestId('searchSessionIndicatorTour')).toBeTruthy();
    });

    test("Doesn't show tour step if state changed before delay", async () => {
      const state$ = new BehaviorSubject(SearchSessionState.Loading);
      const SearchSessionIndicator = createConnectedSearchSessionIndicator({
        sessionService: { ...sessionService, state$ },
        application: coreStart.application,
        timeFilter,
        storage,
      });
      const rendered = render(<SearchSessionIndicator />);

      const searchSessionIndicator = await rendered.findByTestId('searchSessionIndicator');
      expect(searchSessionIndicator).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(3000);
        state$.next(SearchSessionState.Completed);
        jest.advanceTimersByTime(3000);
      });

      expect(rendered.queryByTestId('searchSessionIndicatorTour')).toBeFalsy();
    });
  });

  test('Shows tour step for background completed', async () => {
    const state$ = new BehaviorSubject(SearchSessionState.BackgroundCompleted);
    const SearchSessionIndicator = createConnectedSearchSessionIndicator({
      sessionService: { ...sessionService, state$ },
      application: coreStart.application,
      timeFilter,
      storage,
    });
    const rendered = render(<SearchSessionIndicator />);

    await waitFor(() => rendered.getByTestId('searchSessionIndicator'));
    expect(rendered.queryByTestId('searchSessionIndicatorTour')).toBeTruthy();
  });

  test('Shows tour step for restored', async () => {
    const state$ = new BehaviorSubject(SearchSessionState.Restored);
    const SearchSessionIndicator = createConnectedSearchSessionIndicator({
      sessionService: { ...sessionService, state$ },
      application: coreStart.application,
      timeFilter,
      storage,
    });
    const rendered = render(<SearchSessionIndicator />);

    await waitFor(() => rendered.getByTestId('searchSessionIndicator'));
    expect(rendered.queryByTestId('searchSessionIndicatorTour')).toBeTruthy();
  });

  test('Tour dismiss sets to storage', async () => {
    const state$ = new BehaviorSubject(SearchSessionState.Restored);
    const SearchSessionIndicator = createConnectedSearchSessionIndicator({
      sessionService: { ...sessionService, state$ },
      application: coreStart.application,
      timeFilter,
      storage,
    });
    const rendered = render(<SearchSessionIndicator />);

    await waitFor(() => rendered.getByTestId('searchSessionIndicator'));
    expect(rendered.queryByTestId('searchSessionIndicatorTour')).toBeTruthy();

    const dismissButton = await rendered.findByTestId('searchSessionsPopoverDismissButton');

    fireEvent(
      dismissButton!,
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      })
    );

    expect(storage.get(TOUR_MESSAGES[SearchSessionState.Restored].storageKey)).toBe(true);
  });

  test("Doesn't show tour step if was dismissed", async () => {
    // set as dismissed
    storage.set(TOUR_MESSAGES[SearchSessionState.BackgroundCompleted].storageKey, true);

    const state$ = new BehaviorSubject(SearchSessionState.BackgroundCompleted);
    const SearchSessionIndicator = createConnectedSearchSessionIndicator({
      sessionService: { ...sessionService, state$ },
      application: coreStart.application,
      timeFilter,
      storage,
    });
    const rendered = render(<SearchSessionIndicator />);

    await waitFor(() => rendered.getByTestId('searchSessionIndicator'));

    expect(rendered.queryByTestId('searchSessionIndicatorTour')).toBeFalsy();
  });

  test("Doesn't show tour for irrelevant state", async () => {
    const state$ = new BehaviorSubject(SearchSessionState.Completed);
    const SearchSessionIndicator = createConnectedSearchSessionIndicator({
      sessionService: { ...sessionService, state$ },
      application: coreStart.application,
      timeFilter,
      storage,
    });
    const rendered = render(<SearchSessionIndicator />);

    await waitFor(() => rendered.getByTestId('searchSessionIndicator'));

    expect(rendered.queryByTestId('searchSessionIndicatorTour')).toBeFalsy();
  });
});
