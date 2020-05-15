/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointAppLocation, PolicyListState } from '../../types';
import { applyMiddleware, createStore, Store } from 'redux';
import { AppAction } from '../action';
import { policyListReducer } from './reducer';
import { policyListMiddlewareFactory } from './middleware';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { isOnPolicyListPage, selectIsLoading, urlSearchParams } from './selectors';
import { DepsStartMock, depsStartMock } from '../../mocks';
import { setPolicyListApiMockImplementation } from './test_mock_utils';
import { INGEST_API_DATASOURCES } from './services/ingest';
import { Immutable } from '../../../../../common/types';
import { createSpyMiddleware, MiddlewareActionSpyHelper } from '../test_utils';
import { DATASOURCE_SAVED_OBJECT_TYPE } from '../../../../../../ingest_manager/common';

describe('policy list store concerns', () => {
  let fakeCoreStart: ReturnType<typeof coreMock.createStart>;
  let depsStart: DepsStartMock;
  type PolicyListStore = Store<Immutable<PolicyListState>, Immutable<AppAction>>;
  let store: PolicyListStore;
  let getState: PolicyListStore['getState'];
  let dispatch: PolicyListStore['dispatch'];
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

  it('it does nothing on `userChangedUrl` if pathname is NOT `/policy`', async () => {
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

  it('it reports `isOnPolicyListPage` correctly when router pathname is `/policy`', async () => {
    dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/policy',
        search: '',
        hash: '',
      },
    });
    expect(isOnPolicyListPage(getState())).toBe(true);
  });

  it('it sets `isLoading` when `userChangedUrl`', async () => {
    expect(selectIsLoading(getState())).toBe(false);
    dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/policy',
        search: '',
        hash: '',
      },
    });
    expect(selectIsLoading(getState())).toBe(true);
    await waitForAction('serverReturnedPolicyListData');
    expect(selectIsLoading(getState())).toBe(false);
  });

  it('it resets state on `userChangedUrl` and pathname is NOT `/policy`', async () => {
    dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/policy',
        search: '',
        hash: '',
      },
    });
    await waitForAction('serverReturnedPolicyListData');
    dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/foo',
        search: '',
        hash: '',
      },
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
  it('uses default pagination params when not included in url', async () => {
    dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/policy',
        search: '',
        hash: '',
      },
    });
    await waitForAction('serverReturnedPolicyListData');
    expect(fakeCoreStart.http.get).toHaveBeenCalledWith(INGEST_API_DATASOURCES, {
      query: {
        kuery: `${DATASOURCE_SAVED_OBJECT_TYPE}.package.name: endpoint`,
        page: 1,
        perPage: 10,
      },
    });
  });

  describe('when url contains search params', () => {
    const dispatchUserChangedUrl = (searchParams: string = '') =>
      dispatch({
        type: 'userChangedUrl',
        payload: {
          pathname: '/policy',
          search: searchParams,
          hash: '',
        },
      });

    it('uses pagination params from url', async () => {
      dispatchUserChangedUrl('?page_size=50&page_index=0');
      await waitForAction('serverReturnedPolicyListData');
      expect(fakeCoreStart.http.get).toHaveBeenCalledWith(INGEST_API_DATASOURCES, {
        query: {
          kuery: `${DATASOURCE_SAVED_OBJECT_TYPE}.package.name: endpoint`,
          page: 1,
          perPage: 50,
        },
      });
    });
    it('uses defaults for params not in url', async () => {
      dispatchUserChangedUrl('?page_index=99');
      expect(urlSearchParams(getState())).toEqual({
        page_index: 99,
        page_size: 10,
      });
      dispatchUserChangedUrl('?page_size=50');
      expect(urlSearchParams(getState())).toEqual({
        page_index: 0,
        page_size: 50,
      });
    });
    it('accepts only positive numbers for page_index and page_size', async () => {
      dispatchUserChangedUrl('?page_size=-50&page_index=-99');
      await waitForAction('serverReturnedPolicyListData');
      expect(fakeCoreStart.http.get).toHaveBeenCalledWith(INGEST_API_DATASOURCES, {
        query: {
          kuery: `${DATASOURCE_SAVED_OBJECT_TYPE}.package.name: endpoint`,
          page: 1,
          perPage: 10,
        },
      });
    });
    it('it ignores non-numeric values for page_index and page_size', async () => {
      dispatchUserChangedUrl('?page_size=fifty&page_index=ten');
      await waitForAction('serverReturnedPolicyListData');
      expect(fakeCoreStart.http.get).toHaveBeenCalledWith(INGEST_API_DATASOURCES, {
        query: {
          kuery: `${DATASOURCE_SAVED_OBJECT_TYPE}.package.name: endpoint`,
          page: 1,
          perPage: 10,
        },
      });
    });
    it('accepts only known values for `page_size`', async () => {
      dispatchUserChangedUrl('?page_size=300&page_index=10');
      await waitForAction('serverReturnedPolicyListData');
      expect(fakeCoreStart.http.get).toHaveBeenCalledWith(INGEST_API_DATASOURCES, {
        query: {
          kuery: `${DATASOURCE_SAVED_OBJECT_TYPE}.package.name: endpoint`,
          page: 11,
          perPage: 10,
        },
      });
    });
    it(`ignores unknown url search params`, async () => {
      dispatchUserChangedUrl('?page_size=20&page_index=10&foo=bar');
      expect(urlSearchParams(getState())).toEqual({
        page_index: 10,
        page_size: 20,
      });
    });
    it(`uses last param value if param is defined multiple times`, async () => {
      dispatchUserChangedUrl('?page_size=20&page_size=50&page_index=20&page_index=40');
      expect(urlSearchParams(getState())).toEqual({
        page_index: 40,
        page_size: 50,
      });
    });
  });
});
