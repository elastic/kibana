/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { endpointListReducer } from './endpoints_list';
import { createStore, Store } from 'redux';
import { actions } from '../actions/endpoints_list';
import { EndpointData } from '../../server/types';

describe('reducer: endpoints list', () => {
  let store: Store;
  const getEndpointRecord = (): EndpointData => ({
    machine_id: 'd1a8206f-6022-4632-a5d2-6c81e61a4247',
    created_at: new Date('2019-12-06T14:18:13.881Z'),
    host: {
      name: 'cotsen-5',
      hostname: 'cotsen-5.example.com',
      ip: '10.188.4.100',
      mac_address: '93-c9-3d-ab-e1-11',
      os: {
        name: 'windows 6.2',
        full: 'Windows Server 2012',
      },
    },
    endpoint: {
      domain: 'example.com',
      is_base_image: false,
      active_directory_distinguished_name: 'CN=cotsen-5,DC=example,DC=com',
      active_directory_hostname: 'cotsen-5.example.com',
      upgrade: {},
      isolation: {
        status: false,
      },
      policy: {
        name: 'With Eventing',
        id: 'C2A9093E-E289-4C0A-AA44-8C32A414FA7A',
      },
      sensor: {
        persistence: true,
        status: {},
      },
    },
  });

  beforeEach(() => {
    store = createStore(endpointListReducer);
  });

  test('it initializes the store with expected structure', () => {
    expect(store.getState()).toEqual({
      data: {
        hits: {
          hits: [],
          total: {
            value: 0,
          },
        },
        aggregations: {
          total: {
            value: 0,
          },
        },
      },
      isFiltered: false,
      filteredData: [],
      pageIndex: 0,
      pageSize: 10,
      showPerPageOptions: true,
    });
  });

  test('it handles action#serverReturnedEndpointListData', () => {
    const serverResponse = {
      hits: {
        hits: [getEndpointRecord()],
        total: {
          value: 1,
        },
      },
      aggregations: {
        total: {
          value: 1,
        },
      },
    };

    store.dispatch(actions.serverReturnedEndpointListData(serverResponse));
    expect(store.getState().data).toEqual(serverResponse);
  });

  test('it handles action#userFilteredEndpointListData', () => {
    const filteredRecord = getEndpointRecord();

    store.dispatch(
      actions.userFilteredEndpointListData({
        filteredData: [filteredRecord],
        isFiltered: true,
      })
    );

    const { isFiltered, filteredData } = store.getState();
    expect(isFiltered).toBe(true);
    expect(filteredData).toEqual([filteredRecord]);
  });

  test('it handles action#userPaginatedOrSortedEndpointListTable', () => {
    store.dispatch(
      actions.userPaginatedOrSortedEndpointListTable({
        pageIndex: 100,
        pageSize: 50,
        sortDirection: 'asc',
        sortField: 'Name',
      })
    );

    const { pageIndex, pageSize, sortField, sortDirection } = store.getState();
    expect(pageIndex).toBe(100);
    expect(pageSize).toBe(50);
    expect(sortDirection).toBe('asc');
    expect(sortField).toBe('Name');
  });
});
