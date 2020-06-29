/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PolicyListState } from '../../types';
import { Store, applyMiddleware, createStore } from 'redux';

import { coreMock } from '../../../../../../../../../src/core/public/mocks';
import { PACKAGE_CONFIG_SAVED_OBJECT_TYPE } from '../../../../../../../ingest_manager/common';

import { policyListReducer } from './reducer';
import { policyListMiddlewareFactory } from './middleware';

import {
  isOnPolicyListPage,
  selectIsLoading,
  urlSearchParams,
  selectIsDeleting,
  endpointPackageVersion,
} from './selectors';
import { DepsStartMock, depsStartMock } from '../../../../../common/mock/endpoint';
import { setPolicyListApiMockImplementation } from './test_mock_utils';
import { INGEST_API_PACKAGE_CONFIGS } from './services/ingest';
import {
  createSpyMiddleware,
  MiddlewareActionSpyHelper,
} from '../../../../../common/store/test_utils';
import { getPoliciesPath } from '../../../../common/routing';

describe('policy list store concerns', () => {
  const policyListPathUrl = getPoliciesPath();
  let fakeCoreStart: ReturnType<typeof coreMock.createStart>;
  let depsStart: DepsStartMock;
  let store: Store;
  let waitForAction: MiddlewareActionSpyHelper['waitForAction'];

  beforeEach(() => {
    fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
    depsStart = depsStartMock();
    setPolicyListApiMockImplementation(fakeCoreStart.http);
    let actionSpyMiddleware;
    ({ actionSpyMiddleware, waitForAction } = createSpyMiddleware<PolicyListState>());

    store = createStore(
      policyListReducer,
      undefined,
      applyMiddleware(policyListMiddlewareFactory(fakeCoreStart, depsStart), actionSpyMiddleware)
    );
  });

  it('it does nothing on `userChangedUrl` if pathname is NOT `/policy`', async () => {
    const state = store.getState();
    expect(isOnPolicyListPage(state)).toBe(false);
    store.dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/foo',
        search: '',
        hash: '',
      },
    });
    expect(store.getState()).toEqual(state);
  });

  it('it reports `isOnPolicyListPage` correctly when router pathname is `/policy`', async () => {
    store.dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: policyListPathUrl,
        search: '',
        hash: '',
      },
    });
    expect(isOnPolicyListPage(store.getState())).toBe(true);
  });

  it('it sets `isLoading` when `userChangedUrl`', async () => {
    expect(selectIsLoading(store.getState())).toBe(false);
    store.dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: policyListPathUrl,
        search: '',
        hash: '',
      },
    });
    expect(selectIsLoading(store.getState())).toBe(true);
    await waitForAction('serverReturnedPolicyListData');
    expect(selectIsLoading(store.getState())).toBe(false);
  });

  it('it sets `isDeleting` when `userClickedPolicyListDeleteButton`', async () => {
    expect(selectIsDeleting(store.getState())).toBe(false);
    store.dispatch({
      type: 'userClickedPolicyListDeleteButton',
      payload: {
        policyId: '123',
      },
    });
    expect(selectIsDeleting(store.getState())).toBe(true);
    await waitForAction('serverDeletedPolicy');
    expect(selectIsDeleting(store.getState())).toBe(false);
  });

  it('it sets refreshes policy data when `serverDeletedPolicy`', async () => {
    expect(selectIsLoading(store.getState())).toBe(false);
    store.dispatch({
      type: 'serverDeletedPolicy',
      payload: {
        policyId: '',
        success: true,
      },
    });
    expect(selectIsLoading(store.getState())).toBe(true);
    await waitForAction('serverReturnedPolicyListData');
    expect(selectIsLoading(store.getState())).toBe(false);
  });

  it('it resets state on `userChangedUrl` and pathname is NOT `/policy`', async () => {
    store.dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: policyListPathUrl,
        search: '',
        hash: '',
      },
    });
    await waitForAction('serverReturnedPolicyListData');
    store.dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: '/foo',
        search: '',
        hash: '',
      },
    });
    expect(store.getState()).toEqual({
      apiError: undefined,
      location: undefined,
      policyItems: [],
      isLoading: false,
      isDeleting: false,
      deleteStatus: undefined,
      pageIndex: 0,
      pageSize: 10,
      total: 0,
      agentStatusSummary: {
        error: 0,
        events: 0,
        offline: 0,
        online: 0,
        total: 0,
      },
    });
  });
  it('uses default pagination params when not included in url', async () => {
    store.dispatch({
      type: 'userChangedUrl',
      payload: {
        pathname: policyListPathUrl,
        search: '',
        hash: '',
      },
    });
    await waitForAction('serverReturnedPolicyListData');
    expect(fakeCoreStart.http.get).toHaveBeenCalledWith(INGEST_API_PACKAGE_CONFIGS, {
      query: {
        kuery: `${PACKAGE_CONFIG_SAVED_OBJECT_TYPE}.package.name: endpoint`,
        page: 1,
        perPage: 10,
      },
    });
  });

  describe('when url contains search params', () => {
    const dispatchUserChangedUrl = (searchParams: string = '') =>
      store.dispatch({
        type: 'userChangedUrl',
        payload: {
          pathname: policyListPathUrl,
          search: searchParams,
          hash: '',
        },
      });

    it('uses pagination params from url', async () => {
      dispatchUserChangedUrl('?page_size=50&page_index=0');
      await waitForAction('serverReturnedPolicyListData');
      expect(fakeCoreStart.http.get).toHaveBeenCalledWith(INGEST_API_PACKAGE_CONFIGS, {
        query: {
          kuery: `${PACKAGE_CONFIG_SAVED_OBJECT_TYPE}.package.name: endpoint`,
          page: 1,
          perPage: 50,
        },
      });
    });
    it('uses defaults for params not in url', async () => {
      dispatchUserChangedUrl('?page_index=99');
      expect(urlSearchParams(store.getState())).toEqual({
        page_index: 99,
        page_size: 10,
      });
      dispatchUserChangedUrl('?page_size=50');
      expect(urlSearchParams(store.getState())).toEqual({
        page_index: 0,
        page_size: 50,
      });
    });
    it('accepts only positive numbers for page_index and page_size', async () => {
      dispatchUserChangedUrl('?page_size=-50&page_index=-99');
      await waitForAction('serverReturnedPolicyListData');
      expect(fakeCoreStart.http.get).toHaveBeenCalledWith(INGEST_API_PACKAGE_CONFIGS, {
        query: {
          kuery: `${PACKAGE_CONFIG_SAVED_OBJECT_TYPE}.package.name: endpoint`,
          page: 1,
          perPage: 10,
        },
      });
    });
    it('it ignores non-numeric values for page_index and page_size', async () => {
      dispatchUserChangedUrl('?page_size=fifty&page_index=ten');
      await waitForAction('serverReturnedPolicyListData');
      expect(fakeCoreStart.http.get).toHaveBeenCalledWith(INGEST_API_PACKAGE_CONFIGS, {
        query: {
          kuery: `${PACKAGE_CONFIG_SAVED_OBJECT_TYPE}.package.name: endpoint`,
          page: 1,
          perPage: 10,
        },
      });
    });
    it('accepts only known values for `page_size`', async () => {
      dispatchUserChangedUrl('?page_size=300&page_index=10');
      await waitForAction('serverReturnedPolicyListData');
      expect(fakeCoreStart.http.get).toHaveBeenCalledWith(INGEST_API_PACKAGE_CONFIGS, {
        query: {
          kuery: `${PACKAGE_CONFIG_SAVED_OBJECT_TYPE}.package.name: endpoint`,
          page: 11,
          perPage: 10,
        },
      });
    });
    it(`ignores unknown url search params`, async () => {
      dispatchUserChangedUrl('?page_size=20&page_index=10&foo=bar');
      expect(urlSearchParams(store.getState())).toEqual({
        page_index: 10,
        page_size: 20,
      });
    });
    it(`uses last param value if param is defined multiple times`, async () => {
      dispatchUserChangedUrl('?page_size=20&page_size=50&page_index=20&page_index=40');
      expect(urlSearchParams(store.getState())).toEqual({
        page_index: 40,
        page_size: 50,
      });
    });

    it('should load package information only if not already in state', async () => {
      dispatchUserChangedUrl('?page_size=10&page_index=10');
      await waitForAction('serverReturnedEndpointPackageInfo');
      expect(endpointPackageVersion(store.getState())).toEqual('0.5.0');
      fakeCoreStart.http.get.mockClear();
      dispatchUserChangedUrl('?page_size=10&page_index=11');
      expect(fakeCoreStart.http.get).toHaveBeenCalledWith(INGEST_API_PACKAGE_CONFIGS, {
        query: {
          kuery: `${PACKAGE_CONFIG_SAVED_OBJECT_TYPE}.package.name: endpoint`,
          page: 12,
          perPage: 10,
        },
      });
      expect(endpointPackageVersion(store.getState())).toEqual('0.5.0');
    });
  });
});
