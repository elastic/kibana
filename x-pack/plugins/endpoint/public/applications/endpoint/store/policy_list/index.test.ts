/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointAppLocation, PolicyListState } from '../../types';
import { applyMiddleware, createStore, Dispatch, Store } from 'redux';
import { AppAction } from '../action';
import { policyListReducer } from './reducer';
import { policyListMiddlewareFactory } from './middleware';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { CoreStart } from 'kibana/public';
import { isOnPolicyListPage, selectIsLoading } from './selectors';

describe('policy list store concerns', () => {
  const sleep = () => new Promise(resolve => setTimeout(resolve, 1000));
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let store: Store<PolicyListState>;
  let getState: typeof store['getState'];
  let dispatch: Dispatch<AppAction>;

  beforeEach(() => {
    fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
    store = createStore(
      policyListReducer,
      applyMiddleware(policyListMiddlewareFactory(fakeCoreStart))
    );
    getState = store.getState;
    dispatch = store.dispatch;
  });

  test('it does nothing on `userChangedUrl` if pathname is NOT `/policy`', async () => {
    const state = getState();
    expect(isOnPolicyListPage(state)).toBe(false);
    dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/foo',
        search: '',
        hash: '',
      } as EndpointAppLocation,
    });
    expect(getState()).toEqual(state);
  });

  test('it sets `isOnPage` when `userChangedUrl` with pathname `/policy`', async () => {
    dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/policy',
        search: '',
        hash: '',
      } as EndpointAppLocation,
    });
    expect(isOnPolicyListPage(getState())).toBe(true);
  });

  test('it sets `isLoading` when `userChangedUrl`', async () => {
    expect(selectIsLoading(getState())).toBe(false);
    dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/policy',
        search: '',
        hash: '',
      } as EndpointAppLocation,
    });
    expect(selectIsLoading(getState())).toBe(true);
    await sleep();
    expect(selectIsLoading(getState())).toBe(false);
  });

  test('it resets state on `userChnagedUrl` and pathname is NOT `/policy`', async () => {
    dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/policy',
        search: '',
        hash: '',
      } as EndpointAppLocation,
    });
    dispatch({
      type: 'serverReturnedPolicyListData',
      payload: {
        policyItems: [],
        pageIndex: 20,
        pageSize: 50,
        total: 200,
      },
    });
    dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/foo',
        search: '',
        hash: '',
      } as EndpointAppLocation,
    });
    expect(getState()).toEqual({
      policyItems: [],
      isLoading: false,
      isOnPage: false,
      pageIndex: 0,
      pageSize: 10,
      total: 0,
    });
  });
});
