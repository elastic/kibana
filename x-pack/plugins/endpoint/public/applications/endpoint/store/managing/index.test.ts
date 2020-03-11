/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, Dispatch, Store } from 'redux';
import { ManagementAction, managementListReducer } from './index';
import { EndpointMetadata } from '../../../../../common/types';
import { EndpointDocGenerator } from '../../../../../common/generate_data';
import { ManagementListState } from '../../types';
import { listData } from './selectors';

describe('endpoint_list store concerns', () => {
  let store: Store<ManagementListState>;
  let dispatch: Dispatch<ManagementAction>;
  const generator = new EndpointDocGenerator();
  const createTestStore = () => {
    store = createStore(managementListReducer);
    dispatch = store.dispatch;
  };
  const generateEndpoint = (): EndpointMetadata => {
    return generator.generateEndpointMetadata(new Date().getTime());
  };
  const loadDataToStore = () => {
    dispatch({
      type: 'serverReturnedManagementList',
      payload: {
        endpoints: [generateEndpoint()],
        request_page_size: 1,
        request_page_index: 1,
        total: 10,
      },
    });
  };

  describe('# Reducers', () => {
    beforeEach(() => {
      createTestStore();
    });

    test('it creates default state', () => {
      expect(store.getState()).toEqual({
        endpoints: [],
        pageSize: 10,
        pageIndex: 0,
        total: 0,
        loading: false,
      });
    });

    test('it handles `serverReturnedManagementList', () => {
      const payload = {
        endpoints: [generateEndpoint()],
        request_page_size: 1,
        request_page_index: 1,
        total: 10,
      };
      dispatch({
        type: 'serverReturnedManagementList',
        payload,
      });

      const currentState = store.getState();
      expect(currentState.endpoints).toEqual(payload.endpoints);
      expect(currentState.pageSize).toEqual(payload.request_page_size);
      expect(currentState.pageIndex).toEqual(payload.request_page_index);
      expect(currentState.total).toEqual(payload.total);
    });

    test('it handles `userExitedManagementListPage`', () => {
      loadDataToStore();

      expect(store.getState().total).toEqual(10);

      dispatch({ type: 'userExitedManagementList' });
      expect(store.getState().endpoints.length).toEqual(0);
      expect(store.getState().pageIndex).toEqual(0);
    });
  });

  describe('# Selectors', () => {
    beforeEach(() => {
      createTestStore();
      loadDataToStore();
    });

    test('it selects `managementListData`', () => {
      const currentState = store.getState();
      expect(listData(currentState)).toEqual(currentState.endpoints);
    });
  });
});
