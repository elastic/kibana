/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createStore, Dispatch, Store } from 'redux';
import { EndpointListAction, endpointListReducer } from './index';
import { EndpointMetadata } from '../../../../../common/types';
import { ManagementState } from '../../types';
import { endpointListData } from './selectors';

describe('endpoint_list store concerns', () => {
  let store: Store<ManagementState>;
  let dispatch: Dispatch<EndpointListAction>;
  const createTestStore = () => {
    store = createStore(endpointListReducer);
    dispatch = store.dispatch;
  };
  const generateEndpoint = (): EndpointMetadata => {
    return {
      event: {
        created: new Date(),
      },
      endpoint: {
        policy: {
          id: '',
        },
      },
      agent: {
        version: '',
        id: '',
      },
      host: {
        id: '',
        hostname: '',
        ip: [''],
        mac: [''],
        os: {
          name: '',
          full: '',
          version: '',
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
      expect(currentState.pageSize).toEqual(payload.request_page_size);
      expect(currentState.pageIndex).toEqual(payload.request_page_index);
      expect(currentState.total).toEqual(payload.total);
    });

    test('it handles `userExitedEndpointListPage`', () => {
      loadDataToStore();

      expect(store.getState().total).toEqual(10);

      dispatch({ type: 'userExitedEndpointListPage' });
      expect(store.getState().endpoints.length).toEqual(0);
      expect(store.getState().pageIndex).toEqual(0);
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
