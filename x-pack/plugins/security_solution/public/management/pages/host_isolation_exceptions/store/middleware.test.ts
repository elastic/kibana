/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyMiddleware, createStore, Store } from 'redux';
import { HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../../../common/constants';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
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
import { getHostIsolationExceptionItems, deleteHostIsolationExceptionItems } from '../service';
import { HostIsolationExceptionsPageState } from '../types';
import { initialHostIsolationExceptionsPageState } from './builders';
import { createHostIsolationExceptionsPageMiddleware } from './middleware';
import { hostIsolationExceptionsPageReducer } from './reducer';
import { getListFetchError } from './selector';

jest.mock('../service');
const getHostIsolationExceptionItemsMock = getHostIsolationExceptionItems as jest.Mock;
const deleteHostIsolationExceptionItemsMock = deleteHostIsolationExceptionItems as jest.Mock;

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
      getHostIsolationExceptionItemsMock.mockClear();
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

  describe('When deleting an item from host isolation exceptions', () => {
    beforeEach(() => {
      deleteHostIsolationExceptionItemsMock.mockClear();
      deleteHostIsolationExceptionItemsMock.mockReturnValue(undefined);
      getHostIsolationExceptionItemsMock.mockClear();
      getHostIsolationExceptionItemsMock.mockImplementation(getFoundExceptionListItemSchemaMock);
      store.dispatch({
        type: 'hostIsolationExceptionsMarkToDelete',
        payload: {
          id: '1',
        },
      });
    });

    it('should call the delete exception API when a delete is submitted and advertise a loading status', async () => {
      const waiter = Promise.all([
        // delete loading action
        spyMiddleware.waitForAction('hostIsolationExceptionsDeleteStatusChanged', {
          validate({ payload }) {
            return isLoadingResourceState(payload);
          },
        }),
        // delete finished action
        spyMiddleware.waitForAction('hostIsolationExceptionsDeleteStatusChanged', {
          validate({ payload }) {
            return isLoadedResourceState(payload);
          },
        }),
      ]);
      store.dispatch({
        type: 'hostIsolationExceptionsSubmitDelete',
      });
      await waiter;
      expect(deleteHostIsolationExceptionItemsMock).toHaveBeenLastCalledWith(
        fakeCoreStart.http,
        '1'
      );
    });

    it('should dispatch a failure if the API returns an error', async () => {
      deleteHostIsolationExceptionItemsMock.mockRejectedValue({
        body: { message: 'error message', statusCode: 500, error: 'Internal Server Error' },
      });
      store.dispatch({
        type: 'hostIsolationExceptionsSubmitDelete',
      });
      await spyMiddleware.waitForAction('hostIsolationExceptionsDeleteStatusChanged', {
        validate({ payload }) {
          return isFailedResourceState(payload);
        },
      });
    });

    it('should reload the host isolation exception lists after delete', async () => {
      store.dispatch({
        type: 'hostIsolationExceptionsSubmitDelete',
      });
      await spyMiddleware.waitForAction('hostIsolationExceptionsPageDataChanged', {
        validate({ payload }) {
          return isLoadingResourceState(payload);
        },
      });
    });
  });
});
