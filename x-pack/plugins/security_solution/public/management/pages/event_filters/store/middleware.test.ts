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

import { initialEventFiltersPageState } from './builders';
import { getInitialExceptionFromEvent } from './utils';
import { createdEventFilterEntryMock, ecsEventMock } from '../test_utils';
import { EventFiltersListPageState, EventFiltersService } from '../types';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import { isFailedResourceState, isLoadedResourceState } from '../../../state';
import { getListFetchError } from './selector';
import type {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { Immutable } from '../../../../../common/endpoint/types';
import { parsePoliciesAndFilterToKql } from '../../../common/utils';

const createEventFiltersServiceMock = (): jest.Mocked<EventFiltersService> => ({
  addEventFilters: jest.fn(),
  getList: jest.fn(),
  getOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  getSummary: jest.fn(),
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

describe('Event filters middleware', () => {
  let service: jest.Mocked<EventFiltersService>;
  let store: Store<EventFiltersListPageState>;
  let spyMiddleware: MiddlewareActionSpyHelper<EventFiltersListPageState, AppAction>;
  let initialState: EventFiltersListPageState;

  beforeEach(() => {
    initialState = initialEventFiltersPageState();
    service = createEventFiltersServiceMock();

    const storeSetup = createStoreSetup(service);

    store = storeSetup.store as Store<EventFiltersListPageState>;
    spyMiddleware = storeSetup.spyMiddleware;
  });

  describe('initial state', () => {
    it('sets initial state properly', async () => {
      expect(createStoreSetup(createEventFiltersServiceMock()).store.getState()).toStrictEqual(
        initialState
      );
    });
  });

  describe('when on the List page', () => {
    const changeUrl = (searchParams: string = '') => {
      store.dispatch({
        type: 'userChangedUrl',
        payload: {
          pathname: '/administration/event_filters',
          search: searchParams,
          hash: '',
          key: 'ylsd7h',
        },
      });
    };

    beforeEach(() => {
      service.getList.mockResolvedValue(getFoundExceptionListItemSchemaMock());
    });

    it.each([
      [undefined, undefined, undefined],
      [3, 50, ['1', '2']],
    ])(
      'should trigger api call to retrieve event filters with url params page_index[%s] page_size[%s] included_policies[%s]',
      async (pageIndex, perPage, policies) => {
        const dataLoaded = spyMiddleware.waitForAction('eventFiltersListPageDataChanged', {
          validate({ payload }) {
            return isLoadedResourceState(payload);
          },
        });

        changeUrl(
          (pageIndex &&
            perPage &&
            `?page_index=${pageIndex}&page_size=${perPage}&included_policies=${policies}`) ||
            ''
        );
        await dataLoaded;

        expect(service.getList).toHaveBeenCalledWith({
          page: (pageIndex ?? 0) + 1,
          perPage: perPage ?? 10,
          sortField: 'created_at',
          sortOrder: 'desc',
          filter: policies ? parsePoliciesAndFilterToKql({ policies }) : undefined,
        });
      }
    );

    it('should not refresh the list if nothing in the query has changed', async () => {
      const dataLoaded = spyMiddleware.waitForAction('eventFiltersListPageDataChanged', {
        validate({ payload }) {
          return isLoadedResourceState(payload);
        },
      });

      changeUrl();
      await dataLoaded;
      const getListCallCount = service.getList.mock.calls.length;
      changeUrl('&show=create');

      expect(service.getList.mock.calls.length).toBe(getListCallCount);
    });

    it('should trigger second api call to check if data exists if first returned no records', async () => {
      const dataLoaded = spyMiddleware.waitForAction('eventFiltersListPageDataExistsChanged', {
        validate({ payload }) {
          return isLoadedResourceState(payload);
        },
      });

      service.getList.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        per_page: 10,
      });

      changeUrl();
      await dataLoaded;

      expect(service.getList).toHaveBeenCalledTimes(2);
      expect(service.getList).toHaveBeenNthCalledWith(2, {
        page: 1,
        perPage: 1,
      });
    });

    it('should dispatch a Failure if an API error was encountered', async () => {
      const dataLoaded = spyMiddleware.waitForAction('eventFiltersListPageDataChanged', {
        validate({ payload }) {
          return isFailedResourceState(payload);
        },
      });

      service.getList.mockRejectedValue({
        body: { message: 'error message', statusCode: 500, error: 'Internal Server Error' },
      });

      changeUrl();
      await dataLoaded;

      expect(getListFetchError(store.getState())).toEqual({
        message: 'error message',
        statusCode: 500,
        error: 'Internal Server Error',
      });
    });
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

    it('does submit when entry has empty comments with white spaces', async () => {
      service.addEventFilters.mockImplementation(
        async (exception: Immutable<ExceptionListItemSchema | CreateExceptionListItemSchema>) => {
          expect(exception.comments).toStrictEqual(createdEventFilterEntryMock().comments);
          return createdEventFilterEntryMock();
        }
      );
      const entry = getInitialExceptionFromEvent(ecsEventMock());
      store.dispatch({
        type: 'eventFiltersInitForm',
        payload: { entry },
      });

      store.dispatch({
        type: 'eventFiltersChangeForm',
        payload: { newComment: '   ', entry },
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
