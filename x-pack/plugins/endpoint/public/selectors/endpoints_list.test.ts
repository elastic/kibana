/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as selectors from './endpoints_list';
import { createStore } from 'redux';
import allReducers from '../reducers';
import { GlobalState } from '../types';
import { EndpointData } from '../../server/types';

describe('endpoints list selectors', () => {
  let globalState: GlobalState;
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
    const state = createStore(allReducers);
    globalState = state.getState();
  });

  test('it has expected list of selectors', () => {
    const expectedSelectors = [
      'endpointsListData',
      'isFiltered',
      'filteredEndpointListData',
      'totalHits',
      'pageIndex',
      'pageSize',
      'sortField',
      'sortDirection',
    ];
    for (const selector of Object.keys(selectors)) {
      expect(expectedSelectors).toContain(selector);
    }
  });

  test('it selects using endpointsListData', () => {
    expect(selectors.endpointsListData(globalState)).toEqual([]);

    const endpointListDataMock = [getEndpointRecord()];
    globalState.endpointsList.data.hits.hits = endpointListDataMock;
    expect(selectors.endpointsListData(globalState)).toEqual(endpointListDataMock);
  });

  test('it selects using isFiltered', () => {
    expect(selectors.isFiltered(globalState)).toEqual(false);

    globalState.endpointsList.isFiltered = true;
    expect(selectors.isFiltered(globalState)).toEqual(true);
  });

  test('it selects using filteredEndpointListData', () => {
    expect(selectors.filteredEndpointListData(globalState)).toEqual([]);

    const endpointListDataMock = [getEndpointRecord()];
    globalState.endpointsList.filteredData = endpointListDataMock;
    expect(selectors.filteredEndpointListData(globalState)).toEqual(endpointListDataMock);
  });

  test('it selects using totalHits', () => {
    expect(selectors.totalHits(globalState)).toEqual(0);

    globalState.endpointsList.data.aggregations!.total.value = 1;
    expect(selectors.totalHits(globalState)).toEqual(1);

    // `aggregations` is optional, so selector should not crap out
    delete globalState.endpointsList.data.aggregations;
    expect(selectors.totalHits(globalState)).toEqual(0);
  });

  test('it selects using pageIndex', () => {
    expect(selectors.pageIndex(globalState)).toEqual(0);
    globalState.endpointsList.pageIndex = 1;
    expect(selectors.pageIndex(globalState)).toEqual(1);
  });

  test('it selects using pageSize', () => {
    expect(selectors.pageSize(globalState)).toEqual(10);
    globalState.endpointsList.pageSize = 20;
    expect(selectors.pageSize(globalState)).toEqual(20);
  });

  test('it selects using sortField', () => {
    expect(selectors.sortField(globalState)).toEqual(undefined);
    globalState.endpointsList.sortField = 'Name';
    expect(selectors.sortField(globalState)).toEqual('Name');
  });

  test('it selects using sortDirection', () => {
    expect(selectors.sortDirection(globalState)).toEqual(undefined);
    globalState.endpointsList.sortDirection = 'asc';
    expect(selectors.sortDirection(globalState)).toEqual('asc');
  });
});
