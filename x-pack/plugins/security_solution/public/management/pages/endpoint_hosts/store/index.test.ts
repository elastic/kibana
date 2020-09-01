/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, Dispatch, Store } from 'redux';
import { EndpointState } from '../types';
import { listData } from './selectors';
import { mockEndpointResultList } from './mock_endpoint_result_list';
import { EndpointAction } from './action';
import { endpointListReducer } from './reducer';
import { DEFAULT_POLL_INTERVAL } from '../../../common/constants';

describe('EndpointList store concerns', () => {
  let store: Store<EndpointState>;
  let dispatch: Dispatch<EndpointAction>;
  const createTestStore = () => {
    store = createStore(endpointListReducer);
    dispatch = store.dispatch;
  };

  const loadDataToStore = () => {
    dispatch({
      type: 'serverReturnedEndpointList',
      payload: mockEndpointResultList({ request_page_size: 1, request_page_index: 1, total: 10 }),
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
        nonExistingPolicies: {},
        endpointsExist: true,
        isAutoRefreshEnabled: true,
        autoRefreshInterval: DEFAULT_POLL_INTERVAL,
      });
    });

    test('it handles `serverReturnedEndpointList', () => {
      const payload = mockEndpointResultList({
        request_page_size: 1,
        request_page_index: 1,
        total: 10,
      });
      dispatch({
        type: 'serverReturnedEndpointList',
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

    test('it selects `endpointListData`', () => {
      const currentState = store.getState();
      expect(listData(currentState)).toEqual(currentState.hosts);
    });
  });
});
