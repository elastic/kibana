/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyMiddleware, createStore } from 'redux';

import { createSpyMiddleware } from '../../../../common/store/test_utils';
import { createEventFilterPageMiddleware } from './middleware';
import { eventFilterPageReducer } from './reducer';
import { EventFilterService } from '../service';
import { EventFilterListPageState } from '../state';
import { initialEventFilterPageState } from './builders';
import { getInitialExceptionFromEvent } from './utils';
import { createdEventFilterEntry, event } from '../test_utils';

const initialState: EventFilterListPageState = initialEventFilterPageState();

const createEventFilterServiceMock = (): jest.Mocked<EventFilterService> => ({
  addEventFilter: jest.fn(),
});

const createStoreSetup = (eventFilterService: EventFilterService) => {
  const spyMiddleware = createSpyMiddleware<EventFilterListPageState>();

  return {
    spyMiddleware,
    store: createStore(
      eventFilterPageReducer,
      applyMiddleware(
        createEventFilterPageMiddleware(eventFilterService),
        spyMiddleware.actionSpyMiddleware
      )
    ),
  };
};

describe('middleware', () => {
  describe('initial state', () => {
    it('sets initial state properly', async () => {
      expect(createStoreSetup(createEventFilterServiceMock()).store.getState()).toStrictEqual(
        initialState
      );
    });
  });

  describe('submit creation event filter', () => {
    it('does not submit when entry is undefined', async () => {
      const service = createEventFilterServiceMock();
      const { store } = createStoreSetup(service);

      store.dispatch({ type: 'eventFilterCreateStart' });
      expect(store.getState()).toStrictEqual({
        ...initialState,
        form: {
          ...store.getState().form,
          submissionResourceState: { type: 'UninitialisedResourceState' },
        },
      });
    });

    it('does submit when entry is not undefined', async () => {
      const service = createEventFilterServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);
      service.addEventFilter.mockResolvedValue(createdEventFilterEntry);
      const entry = getInitialExceptionFromEvent(event);
      store.dispatch({
        type: 'eventFilterInitForm',
        payload: { entry },
      });

      store.dispatch({ type: 'eventFilterCreateStart' });

      await spyMiddleware.waitForAction('eventFilterFormStateChanged');
      expect(store.getState()).toStrictEqual({
        ...initialState,
        form: {
          ...store.getState().form,
          submissionResourceState: {
            type: 'LoadedResourceState',
            data: createdEventFilterEntry,
          },
        },
      });
    });

    it('does throw error when creating', async () => {
      const service = createEventFilterServiceMock();
      const { store, spyMiddleware } = createStoreSetup(service);
      service.addEventFilter.mockRejectedValue({
        body: { message: 'error message', statusCode: 500, error: 'Internal Server Error' },
      });
      const entry = getInitialExceptionFromEvent(event);
      store.dispatch({
        type: 'eventFilterInitForm',
        payload: { entry },
      });

      store.dispatch({ type: 'eventFilterCreateStart' });

      await spyMiddleware.waitForAction('eventFilterFormStateChanged');
      expect(store.getState()).toStrictEqual({
        ...initialState,
        form: {
          ...store.getState().form,
          submissionResourceState: {
            type: 'FailedResourceState',
            lastLoadedState: undefined,
            error: {
              error: 'Internal Server Error',
              message: 'error message',
              statusCode: 500,
            },
          },
        },
      });
    });
  });
});
