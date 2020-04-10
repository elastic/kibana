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
import { isOnPolicyListPage, selectIsLoading } from './selectors';
import { DepsStartMock, depsStartMock } from '../../mocks';
import {
  createSpyMiddleware,
  MiddlewareActionSpyHelper,
  setPolicyListApiMockImplementation,
} from './test_mock_utils';

describe('policy list store concerns', () => {
  const sleep = () => new Promise(resolve => setTimeout(resolve, 1000));
  let fakeCoreStart: ReturnType<typeof coreMock.createStart>;
  let depsStart: DepsStartMock;
  let store: Store<PolicyListState>;
  let getState: typeof store['getState'];
  let dispatch: Dispatch<AppAction>;
  let waitForAction: MiddlewareActionSpyHelper['waitForAction'];

  beforeEach(() => {
    fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
    depsStart = depsStartMock();
    setPolicyListApiMockImplementation(fakeCoreStart.http);
    let actionSpyMiddleware;
    ({ actionSpyMiddleware, waitForAction } = createSpyMiddleware<PolicyListState>());

    store = createStore(
      policyListReducer,
      applyMiddleware(policyListMiddlewareFactory(fakeCoreStart, depsStart), actionSpyMiddleware)
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
    await waitForAction('serverReturnedPolicyListData');
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
    // await waitForAction('name-of-action');
    await sleep();
    expect(selectIsLoading(getState())).toBe(false);
  });

  test('it resets state on `userChangedUrl` and pathname is NOT `/policy`', async () => {
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
      apiError: undefined,
      location: undefined,
      policyItems: [],
      isLoading: false,
      pageIndex: 0,
      pageSize: 10,
      total: 0,
    });
  });
});
