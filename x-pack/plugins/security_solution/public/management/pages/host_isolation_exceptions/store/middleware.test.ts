/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types'; */
import { applyMiddleware, createStore, Store } from 'redux';
import { HOST_ISOLATION_EXCEPTIONS_PATH } from '../../../../../common/constants';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
// import { Immutable } from '../../../../../common/endpoint/types';
import { AppAction } from '../../../../common/store/actions';
import {
  createSpyMiddleware,
  MiddlewareActionSpyHelper,
} from '../../../../common/store/test_utils';
import { isFailedResourceState, isLoadedResourceState } from '../../../state';
import { getHostIsolationExceptionsList } from '../service';
import { HostIsolationExceptionsPageState } from '../types';
import { initialHostIsolationExceptionsPageState } from './builders';
import { createHostIsolationExceptionsPageMiddleware } from './middleware';
import { hostIsolationExceptionsPageReducer } from './reducer';
import { getListFetchError } from './selector';

jest.mock('../service');
const getHostIsolationExceptionsListMock = getHostIsolationExceptionsList as jest.Mock;

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
      getHostIsolationExceptionsListMock.mockClear();
      getHostIsolationExceptionsListMock.mockImplementation(getFoundExceptionListItemSchemaMock);
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

        expect(getHostIsolationExceptionsListMock).toHaveBeenCalledWith(
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
      expect(getHostIsolationExceptionsListMock).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          perPage: 10,
          filter:
            '(exception-list-agnostic.attributes.name:(*testMe*) OR exception-list-agnostic.attributes.description:(*testMe*) OR exception-list-agnostic.attributes.entries.value:(*testMe*))',
        })
      );
    });

    it('should dispatch a Failure if an API error was encountered', async () => {
      getHostIsolationExceptionsListMock.mockRejectedValue({
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
});
