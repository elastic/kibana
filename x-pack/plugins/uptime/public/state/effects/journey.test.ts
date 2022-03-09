/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Store } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { createStore as createReduxStore, applyMiddleware } from 'redux';

import { rootReducer } from '../reducers';
import { fetchJourneyStepsEffect } from '../effects/journey';

import { getJourneySteps } from '../actions/journey';

import { fetchJourneySteps } from '../api/journey';

jest.mock('../api/journey', () => ({
  fetchJourneySteps: jest.fn(),
}));

const createTestStore = (): Store => {
  const sagaMW = createSagaMiddleware();
  const store = createReduxStore(rootReducer, applyMiddleware(sagaMW));
  sagaMW.run(fetchJourneyStepsEffect);
  return store;
};

describe('journey effect', () => {
  afterEach(() => jest.resetAllMocks());
  afterAll(() => jest.restoreAllMocks());

  it('fetches only once when dispatching multiple getJourneySteps for a particular ID', () => {
    (fetchJourneySteps as jest.Mock).mockResolvedValue({
      checkGroup: 'saga-test',
      details: {
        journey: {
          monitor: { name: 'test-name' },
        },
      },
    });

    const store = createTestStore();

    // Actually dispatched
    store.dispatch(getJourneySteps({ checkGroup: 'saga-test' }));

    // Skipped
    store.dispatch(getJourneySteps({ checkGroup: 'saga-test' }));

    expect(fetchJourneySteps).toHaveBeenCalledTimes(1);
  });

  it('fetches multiple times for different IDs', () => {
    (fetchJourneySteps as jest.Mock).mockResolvedValue({
      checkGroup: 'saga-test',
      details: {
        journey: {
          monitor: { name: 'test-name' },
        },
      },
    });

    const store = createTestStore();

    // Actually dispatched
    store.dispatch(getJourneySteps({ checkGroup: 'saga-test' }));

    // Skipped
    store.dispatch(getJourneySteps({ checkGroup: 'saga-test' }));

    // Actually dispatched because it has a different ID
    store.dispatch(getJourneySteps({ checkGroup: 'saga-test-second' }));

    expect(fetchJourneySteps).toHaveBeenCalledTimes(2);
  });

  it('can re-fetch after an ID is fetched', async () => {
    (fetchJourneySteps as jest.Mock).mockResolvedValue({
      checkGroup: 'saga-test',
      details: {
        journey: {
          monitor: { name: 'test-name' },
        },
      },
    });

    const store = createTestStore();

    const waitForStateUpdate = (): Promise<void> =>
      new Promise((resolve) => store.subscribe(() => resolve()));

    // Actually dispatched
    store.dispatch(getJourneySteps({ checkGroup: 'saga-test' }));

    await waitForStateUpdate();

    // Also dispatched given its initial request is not in-flight anymore
    store.dispatch(getJourneySteps({ checkGroup: 'saga-test' }));

    expect(fetchJourneySteps).toHaveBeenCalledTimes(2);
  });
});
