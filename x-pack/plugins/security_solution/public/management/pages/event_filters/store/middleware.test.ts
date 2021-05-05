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
import { createEventFiltersPageMiddleware } from './middleware';
import { eventFiltersPageReducer } from './reducer';

import { EventFiltersListPageState } from '../state';
import { initialEventFiltersPageState } from './builders';
import { getInitialExceptionFromEvent } from './utils';
import { createdEventFilterEntryMock, ecsEventMock } from '../test_utils';
import { EventFiltersService } from '../types';

const initialState: EventFiltersListPageState = initialEventFiltersPageState();

const createEventFiltersServiceMock = (): jest.Mocked<EventFiltersService> => ({
  addEventFilters: jest.fn(),
  getList: jest.fn(),
  getOne: jest.fn(),
  updateOne: jest.fn(),
});

const createStoreSetup = (eventFiltersService: EventFiltersService) => {
  const spyMiddleware = createSpyMiddleware<EventFiltersListPageState>();

  return {
    spyMiddleware,
    store: createStore(
      eventFiltersPageReducer,
      applyMiddleware(
        createEventFiltersPageMiddleware(eventFiltersService),
        spyMiddleware.actionSpyMiddleware
      )
    ),
  };
};

describe('middleware', () => {
  describe('initial state', () => {
    it('sets initial state properly', async () => {
      expect(createStoreSetup(createEventFiltersServiceMock()).store.getState()).toStrictEqual(
        initialState
      );
    });
  });

  let service: jest.Mocked<EventFiltersService>;
  let store: Store<EventFiltersListPageState>;
  let spyMiddleware: MiddlewareActionSpyHelper<EventFiltersListPageState, AppAction>;

  beforeEach(() => {
    service = createEventFiltersServiceMock();
    const storeSetup = createStoreSetup(service);
    store = storeSetup.store as Store<EventFiltersListPageState>;
    spyMiddleware = storeSetup.spyMiddleware;
  });

  describe('submit creation event filter', () => {
    it('does not submit when entry is undefined', async () => {
      store.dispatch({ type: 'eventFiltersCreateStart' });
      expect(store.getState()).toStrictEqual({
        ...initialState,
        form: {
          ...store.getState().form,
          submissionResourceState: { type: 'UninitialisedResourceState' },
        },
      });
    });

    it('does submit when entry is not undefined', async () => {
      service.addEventFilters.mockResolvedValue(createdEventFilterEntryMock());
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      store.dispatch({
        type: 'eventFiltersInitForm',
        payload: { entry },
      });

      store.dispatch({ type: 'eventFiltersCreateStart' });

      await spyMiddleware.waitForAction('eventFiltersFormStateChanged');
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
      service.addEventFilters.mockRejectedValue({
        body: { message: 'error message', statusCode: 500, error: 'Internal Server Error' },
      });
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      store.dispatch({
        type: 'eventFiltersInitForm',
        payload: { entry },
      });

      store.dispatch({ type: 'eventFiltersCreateStart' });

      await spyMiddleware.waitForAction('eventFiltersFormStateChanged');
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
  describe('load event filterby id', () => {
    it('init form with an entry loaded by id from API', async () => {
      service.getOne.mockResolvedValue(createdEventFilterEntryMock());
      store.dispatch({ type: 'eventFiltersInitFromId', payload: { id: 'id' } });
      await spyMiddleware.waitForAction('eventFiltersInitForm');
      expect(store.getState()).toStrictEqual({
        ...initialState,
        form: {
          ...store.getState().form,
          entry: createdEventFilterEntryMock(),
        },
      });
    });

    it('does throw error when getting by id', async () => {
      service.getOne.mockRejectedValue({
        body: { message: 'error message', statusCode: 500, error: 'Internal Server Error' },
      });
      store.dispatch({ type: 'eventFiltersInitFromId', payload: { id: 'id' } });
      await spyMiddleware.waitForAction('eventFiltersFormStateChanged');
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
  describe('submit update event filter', () => {
    it('does not submit when entry is undefined', async () => {
      store.dispatch({ type: 'eventFiltersUpdateStart' });
      expect(store.getState()).toStrictEqual({
        ...initialState,
        form: {
          ...store.getState().form,
          submissionResourceState: { type: 'UninitialisedResourceState' },
        },
      });
    });

    it('does submit when entry is not undefined', async () => {
      service.updateOne.mockResolvedValue(createdEventFilterEntryMock());

      store.dispatch({
        type: 'eventFiltersInitForm',
        payload: { entry: createdEventFilterEntryMock() },
      });

      store.dispatch({ type: 'eventFiltersUpdateStart' });

      await spyMiddleware.waitForAction('eventFiltersFormStateChanged');
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
      service.updateOne.mockRejectedValue({
        body: { message: 'error message', statusCode: 500, error: 'Internal Server Error' },
      });
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      store.dispatch({
        type: 'eventFiltersInitForm',
        payload: { entry },
      });

      store.dispatch({ type: 'eventFiltersUpdateStart' });

      await spyMiddleware.waitForAction('eventFiltersFormStateChanged');
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
