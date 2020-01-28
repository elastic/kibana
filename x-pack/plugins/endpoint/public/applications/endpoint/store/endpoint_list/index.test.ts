/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, Dispatch, Store } from 'redux';
import { EndpointListAction, EndpointData, endpointListReducer, EndpointListState } from './index';
import { endpointListData } from './selectors';

describe('endpoint_list store concerns', () => {
  let store: Store<EndpointListState>;
  let dispatch: Dispatch<EndpointListAction>;
  const createTestStore = () => {
    store = createStore(endpointListReducer);
    dispatch = store.dispatch;
  };
  const generateEndpoint = (): EndpointData => {
    return {
      machine_id: Math.random()
        .toString(16)
        .substr(2),
      created_at: new Date(),
      host: {
        name: '',
        hostname: '',
        ip: '',
        mac_address: '',
        os: {
          name: '',
          full: '',
        },
      },
      endpoint: {
        domain: '',
        is_base_image: true,
        active_directory_distinguished_name: '',
        active_directory_hostname: '',
        upgrade: {
          status: '',
          updated_at: new Date(),
        },
        isolation: {
          status: false,
          request_status: true,
          updated_at: new Date(),
        },
        policy: {
          name: '',
          id: '',
        },
        sensor: {
          persistence: true,
          status: {},
        },
      },
    };
  };
  const loadDataToStore = () => {
    dispatch({
      type: 'serverReturnedEndpointList',
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
        request_page_size: 10,
        request_page_index: 0,
        total: 0,
      });
    });

    test('it handles `serverReturnedEndpointList', () => {
      const payload = {
        endpoints: [generateEndpoint()],
        request_page_size: 1,
        request_page_index: 1,
        total: 10,
      };
      dispatch({
        type: 'serverReturnedEndpointList',
        payload,
      });

      const currentState = store.getState();
      expect(currentState.endpoints).toEqual(payload.endpoints);
      expect(currentState.request_page_size).toEqual(payload.request_page_size);
      expect(currentState.request_page_index).toEqual(payload.request_page_index);
      expect(currentState.total).toEqual(payload.total);
    });

    test('it handles `userExitedEndpointListPage`', () => {
      loadDataToStore();

      expect(store.getState().total).toEqual(10);

      dispatch({ type: 'userExitedEndpointListPage' });
      expect(store.getState().endpoints.length).toEqual(0);
      expect(store.getState().request_page_index).toEqual(0);
    });
  });

  describe('# Selectors', () => {
    beforeEach(() => {
      createTestStore();
      loadDataToStore();
    });

    test('it selects `endpointListData`', () => {
      const currentState = store.getState();
      expect(endpointListData(currentState)).toEqual(currentState.endpoints);
    });
  });
});
