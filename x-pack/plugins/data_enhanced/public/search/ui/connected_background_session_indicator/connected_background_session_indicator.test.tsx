/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, waitFor, screen, act } from '@testing-library/react';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { createConnectedBackgroundSessionIndicator } from './connected_background_session_indicator';
import { BehaviorSubject } from 'rxjs';
import {
  ISessionService,
  RefreshInterval,
  SessionState,
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
  const BackgroundSessionIndicator = createConnectedBackgroundSessionIndicator({
    sessionService,
    application: coreStart.application,
    timeFilter,
  });
  const { getByTestId, container } = render(<BackgroundSessionIndicator />);

  // make sure `backgroundSessionIndicator` isn't appearing after some time (lazy-loading)
  await expect(
    waitFor(() => getByTestId('backgroundSessionIndicator'), { timeout: 100 })
  ).rejects.toThrow();
  expect(container).toMatchInlineSnapshot(`<div />`);
});

test('should show indicator in case there is an active search session', async () => {
  const state$ = new BehaviorSubject(SessionState.Loading);
  const BackgroundSessionIndicator = createConnectedBackgroundSessionIndicator({
    sessionService: { ...sessionService, state$ },
    application: coreStart.application,
    timeFilter,
  });
  const { getByTestId } = render(<BackgroundSessionIndicator />);

  await waitFor(() => getByTestId('backgroundSessionIndicator'));
});

test('should be disabled during auto-refresh', async () => {
  const state$ = new BehaviorSubject(SessionState.Loading);
  const BackgroundSessionIndicator = createConnectedBackgroundSessionIndicator({
    sessionService: { ...sessionService, state$ },
    application: coreStart.application,
    timeFilter,
  });

  render(<BackgroundSessionIndicator />);

  await waitFor(() => screen.getByTestId('backgroundSessionIndicator'));

  expect(
    screen.getByTestId('backgroundSessionIndicator').querySelector('button')
  ).not.toBeDisabled();

  act(() => {
    refreshInterval$.next({ value: 0, pause: false });
  });

  expect(screen.getByTestId('backgroundSessionIndicator').querySelector('button')).toBeDisabled();
});
