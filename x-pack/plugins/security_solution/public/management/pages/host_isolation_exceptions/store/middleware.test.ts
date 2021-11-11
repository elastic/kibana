/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListItemSchema,
  UpdateEndpointListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { applyMiddleware, createStore, Store } from 'redux';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import { HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../../../common/constants';
import { AppAction } from '../../../../common/store/actions';
import {
  createSpyMiddleware,
  MiddlewareActionSpyHelper,
} from '../../../../common/store/test_utils';
import {
  isFailedResourceState,
  isLoadedResourceState,
  isLoadingResourceState,
} from '../../../state';
import {
  createHostIsolationExceptionItem,
  getHostIsolationExceptionItems,
  getOneHostIsolationExceptionItem,
  updateOneHostIsolationExceptionItem,
} from '../service';
import { HostIsolationExceptionsPageState } from '../types';
import { createEmptyHostIsolationException } from '../utils';
import { initialHostIsolationExceptionsPageState } from './builders';
import { createHostIsolationExceptionsPageMiddleware } from './middleware';
import { hostIsolationExceptionsPageReducer } from './reducer';
import { getListFetchError } from './selector';

jest.mock('../service');
const getHostIsolationExceptionItemsMock = getHostIsolationExceptionItems as jest.Mock;
const createHostIsolationExceptionItemMock = createHostIsolationExceptionItem as jest.Mock;
const getOneHostIsolationExceptionItemMock = getOneHostIsolationExceptionItem as jest.Mock;
const updateOneHostIsolationExceptionItemMock = updateOneHostIsolationExceptionItem as jest.Mock;

const fakeCoreStart = coreMock.createStart({ basePath: '/mock' });

const createStoreSetup = () => {
  const spyMiddleware = createSpyMiddleware<HostIsolationExceptionsPageState>();

  return {
    spyMiddleware,
    store: createStore(
      hostIsolationExceptionsPageReducer,
      applyMiddleware(
        createHostIsolationExceptionsPageMiddleware(fakeCoreStart),
        spyMiddleware.actionSpyMiddleware
      )
    ),
  };
};

describe('Host isolation exceptions middleware', () => {
  let store: Store<HostIsolationExceptionsPageState>;
  let spyMiddleware: MiddlewareActionSpyHelper<HostIsolationExceptionsPageState, AppAction>;
  let initialState: HostIsolationExceptionsPageState;

  beforeEach(() => {
    initialState = initialHostIsolationExceptionsPageState();

    const storeSetup = createStoreSetup();

    store = storeSetup.store as Store<HostIsolationExceptionsPageState>;
    spyMiddleware = storeSetup.spyMiddleware;
  });

  describe('initial state', () => {
    it('sets initial state properly', async () => {
      expect(createStoreSetup().store.getState()).toStrictEqual(initialState);
    });
  });

  describe('when on the List page', () => {
    const changeUrl = (searchParams: string = '') => {
      store.dispatch({
        type: 'userChangedUrl',
        payload: {
          pathname: HOST_ISOLATION_EXCEPTIONS_PATH,
          search: searchParams,
          hash: '',
          key: 'miniMe',
        },
      });
    };

    beforeEach(() => {
      getHostIsolationExceptionItemsMock.mockReset();
      getHostIsolationExceptionItemsMock.mockImplementation(getFoundExceptionListItemSchemaMock);
    });

    it.each([
      [undefined, undefined],
      [3, 50],
    ])(
      'should trigger api call to retrieve host isolation exceptions params page_index[%s] page_size[%s]',
      async (pageIndex, perPage) => {
        changeUrl((pageIndex && perPage && `?page_index=${pageIndex}&page_size=${perPage}`) || '');
        await spyMiddleware.waitForAction('hostIsolationExceptionsPageDataChanged', {
          validate({ payload }) {
            return isLoadedResourceState(payload);
          },
        });

        expect(getHostIsolationExceptionItemsMock).toHaveBeenCalledWith(
          expect.objectContaining({
            page: (pageIndex ?? 0) + 1,
            perPage: perPage ?? 10,
            filter: undefined,
          })
        );
      }
    );

    it('should clear up previous page and apply a filter configuration when a filter is used', async () => {
      changeUrl('?filter=testMe');
      await spyMiddleware.waitForAction('hostIsolationExceptionsPageDataChanged', {
        validate({ payload }) {
          return isLoadedResourceState(payload);
        },
      });
      expect(getHostIsolationExceptionItemsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          perPage: 10,
          filter:
            '(exception-list-agnostic.attributes.name:(*testMe*) OR exception-list-agnostic.attributes.description:(*testMe*) OR exception-list-agnostic.attributes.entries.value:(*testMe*))',
        })
      );
    });

    it('should dispatch a Failure if an API error was encountered', async () => {
      getHostIsolationExceptionItemsMock.mockRejectedValue({
        body: { message: 'error message', statusCode: 500, error: 'Internal Server Error' },
      });

      changeUrl();
      await spyMiddleware.waitForAction('hostIsolationExceptionsPageDataChanged', {
        validate({ payload }) {
          return isFailedResourceState(payload);
        },
      });

      expect(getListFetchError(store.getState())).toEqual({
        message: 'error message',
        statusCode: 500,
        error: 'Internal Server Error',
      });
    });
  });

  describe('When adding an item to host isolation exceptions', () => {
    let entry: CreateExceptionListItemSchema;
    beforeEach(() => {
      createHostIsolationExceptionItemMock.mockReset();
      entry = {
        ...createEmptyHostIsolationException(),
        name: 'test name',
        description: 'description',
        entries: [
          {
            field: 'destination.ip',
            operator: 'included',
            type: 'match',
            value: '10.0.0.1',
          },
        ],
      };
    });

    it('should dispatch a form loading state when an entry is submited', async () => {
      const waiter = spyMiddleware.waitForAction('hostIsolationExceptionsFormStateChanged', {
        validate({ payload }) {
          return isLoadingResourceState(payload);
        },
      });
      store.dispatch({
        type: 'hostIsolationExceptionsCreateEntry',
        payload: entry,
      });
      await waiter;
    });

    it('should dispatch a form success state when an entry is confirmed by the API', async () => {
      const waiter = spyMiddleware.waitForAction('hostIsolationExceptionsFormStateChanged', {
        validate({ payload }) {
          return isLoadedResourceState(payload);
        },
      });
      store.dispatch({
        type: 'hostIsolationExceptionsCreateEntry',
        payload: entry,
      });
      await waiter;
      expect(createHostIsolationExceptionItemMock).toHaveBeenCalledWith({
        http: fakeCoreStart.http,
        exception: entry,
      });
    });

    it('should dispatch a form failure state when an entry is rejected by the API', async () => {
      createHostIsolationExceptionItemMock.mockRejectedValue({
        body: { message: 'error message', statusCode: 500, error: 'Not today' },
      });
      const waiter = spyMiddleware.waitForAction('hostIsolationExceptionsFormStateChanged', {
        validate({ payload }) {
          return isFailedResourceState(payload);
        },
      });
      store.dispatch({
        type: 'hostIsolationExceptionsCreateEntry',
        payload: entry,
      });
      await waiter;
    });
  });

  describe('When updating an item from host isolation exceptions', () => {
    const fakeId = 'dc5d1d00-2766-11ec-981f-7f84cfc8764f';
    let fakeException: UpdateEndpointListItemSchema;
    beforeEach(() => {
      fakeException = {
        ...createEmptyHostIsolationException(),
        name: 'name edit me',
        description: 'initial description',
        id: fakeId,
        item_id: fakeId,
        entries: [
          {
            field: 'destination.ip',
            operator: 'included',
            type: 'match',
            value: '10.0.0.5',
          },
        ],
      };
      getOneHostIsolationExceptionItemMock.mockReset();
      getOneHostIsolationExceptionItemMock.mockImplementation(async () => {
        return fakeException;
      });
    });

    it('should load data from an entry when an exception is marked to edit', async () => {
      const waiter = spyMiddleware.waitForAction('hostIsolationExceptionsFormEntryChanged');
      store.dispatch({
        type: 'hostIsolationExceptionsMarkToEdit',
        payload: {
          id: fakeId,
        },
      });
      await waiter;
      expect(getOneHostIsolationExceptionItemMock).toHaveBeenCalledWith(fakeCoreStart.http, fakeId);
    });

    it('should call the update API when an item edit is submitted', async () => {
      const waiter = Promise.all([
        // loading status
        spyMiddleware.waitForAction('hostIsolationExceptionsFormStateChanged', {
          validate: ({ payload }) => {
            return isLoadingResourceState(payload);
          },
        }),
        // loaded status
        spyMiddleware.waitForAction('hostIsolationExceptionsFormStateChanged', {
          validate({ payload }) {
            return isLoadedResourceState(payload);
          },
        }),
      ]);
      store.dispatch({
        type: 'hostIsolationExceptionsSubmitEdit',
        payload: fakeException,
      });
      expect(updateOneHostIsolationExceptionItemMock).toHaveBeenCalledWith(fakeCoreStart.http, {
        name: 'name edit me',
        description: 'initial description',
        id: fakeId,
        item_id: fakeId,
        entries: [
          {
            field: 'destination.ip',
            operator: 'included',
            type: 'match',
            value: '10.0.0.5',
          },
        ],
        namespace_type: 'agnostic',
        os_types: ['windows', 'linux', 'macos'],
        tags: ['policy:all'],
        type: 'simple',
        comments: [],
      });
      await waiter;
    });

    it('should dispatch a form failure state when an entry is rejected by the API', async () => {
      updateOneHostIsolationExceptionItemMock.mockRejectedValue({
        body: { message: 'error message', statusCode: 500, error: 'Not today' },
      });
      const waiter = spyMiddleware.waitForAction('hostIsolationExceptionsFormStateChanged', {
        validate({ payload }) {
          return isFailedResourceState(payload);
        },
      });
      store.dispatch({
        type: 'hostIsolationExceptionsSubmitEdit',
        payload: fakeException,
      });
      await waiter;
    });
  });
});
