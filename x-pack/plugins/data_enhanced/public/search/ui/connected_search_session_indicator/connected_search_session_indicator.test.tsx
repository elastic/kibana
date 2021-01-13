/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, waitFor, screen, act } from '@testing-library/react';
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

const coreStart = coreMock.createStart();
const dataStart = dataPluginMock.createStartContract();
const sessionService = dataStart.search.session as jest.Mocked<ISessionService>;

const refreshInterval$ = new BehaviorSubject<RefreshInterval>({ value: 0, pause: true });
const timeFilter = dataStart.query.timefilter.timefilter as jest.Mocked<TimefilterContract>;
timeFilter.getRefreshIntervalUpdate$.mockImplementation(() => refreshInterval$);
timeFilter.getRefreshInterval.mockImplementation(() => refreshInterval$.getValue());

beforeEach(() => {
  refreshInterval$.next({ value: 0, pause: true });
});

test("shouldn't show indicator in case no active search session", async () => {
  const SearchSessionIndicator = createConnectedSearchSessionIndicator({
    sessionService,
    application: coreStart.application,
    timeFilter,
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
  });

  render(<SearchSessionIndicator />);

  await waitFor(() => screen.getByTestId('searchSessionIndicator'));

  expect(screen.getByTestId('searchSessionIndicator').querySelector('button')).not.toBeDisabled();

  act(() => {
    refreshInterval$.next({ value: 0, pause: false });
  });

  expect(screen.getByTestId('searchSessionIndicator').querySelector('button')).toBeDisabled();
});
