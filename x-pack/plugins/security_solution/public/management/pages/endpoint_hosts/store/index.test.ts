/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, Dispatch, Store } from 'redux';
import { HostState } from '../types';
import { listData } from './selectors';
import { mockHostResultList } from './mock_host_result_list';
import { HostAction } from './action';
import { hostListReducer } from './reducer';

describe('HostList store concerns', () => {
  let store: Store<HostState>;
  let dispatch: Dispatch<HostAction>;
  const createTestStore = () => {
    store = createStore(hostListReducer);
    dispatch = store.dispatch;
  };

  const loadDataToStore = () => {
    dispatch({
      type: 'serverReturnedHostList',
      payload: mockHostResultList({ request_page_size: 1, request_page_index: 1, total: 10 }),
    });
  };

  describe('# Reducers', () => {
    beforeEach(() => {
      createTestStore();
    });

    test('it creates default state', () => {
      expect(store.getState()).toEqual({
        hosts: [],
        pageSize: 10,
        pageIndex: 0,
        total: 0,
        loading: false,
        error: undefined,
        details: undefined,
        detailsLoading: false,
        detailsError: undefined,
        policyResponse: undefined,
        policyResponseLoading: false,
        policyResponseError: undefined,
        location: undefined,
        policyItems: [],
        selectedPolicyId: undefined,
        policyItemsLoading: false,
        endpointPackageInfo: undefined,
      });
    });

    test('it handles `serverReturnedHostList', () => {
      const payload = mockHostResultList({
        request_page_size: 1,
        request_page_index: 1,
        total: 10,
      });
      dispatch({
        type: 'serverReturnedHostList',
        payload,
      });

      const currentState = store.getState();
      expect(currentState.hosts).toEqual(payload.hosts);
      expect(currentState.pageSize).toEqual(payload.request_page_size);
      expect(currentState.pageIndex).toEqual(payload.request_page_index);
      expect(currentState.total).toEqual(payload.total);
    });
  });

  describe('# Selectors', () => {
    beforeEach(() => {
      createTestStore();
      loadDataToStore();
    });

    test('it selects `hostListData`', () => {
      const currentState = store.getState();
      expect(listData(currentState)).toEqual(currentState.hosts);
    });
  });
});
