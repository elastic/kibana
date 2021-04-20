/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyMiddleware, createStore, Store } from 'redux';

import {
  createSpyMiddleware,
  MiddlewareActionSpyHelper,
} from '../../../../common/store/test_utils';
import { AppAction } from '../../../../common/store/actions';
import { createEventFilterPageMiddleware } from './middleware';
import { eventFilterPageReducer } from './reducer';
import { EventFilterService } from '../service';
import { EventFilterListPageState } from '../state';
import { initialEventFilterPageState } from './builders';
import { getInitialExceptionFromEvent } from './utils';
import { createdEventFilterEntryMock, ecsEventMock } from '../test_utils';

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
    let service: jest.Mocked<EventFilterService>;
    let store: Store<EventFilterListPageState>;
    let spyMiddleware: MiddlewareActionSpyHelper<EventFilterListPageState, AppAction>;

    beforeEach(() => {
      service = createEventFilterServiceMock();
      const storeSetup = createStoreSetup(service);
      store = storeSetup.store as Store<EventFilterListPageState>;
      spyMiddleware = storeSetup.spyMiddleware;
    });

    it('does not submit when entry is undefined', async () => {
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
      service.addEventFilter.mockResolvedValue(createdEventFilterEntryMock());
      const entry = getInitialExceptionFromEvent(ecsEventMock());
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
            data: createdEventFilterEntryMock(),
          },
        },
      });
    });

    it('does throw error when creating', async () => {
      service.addEventFilter.mockRejectedValue({
        body: { message: 'error message', statusCode: 500, error: 'Internal Server Error' },
      });
      const entry = getInitialExceptionFromEvent(ecsEventMock());
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
