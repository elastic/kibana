/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers, createStore } from 'redux';
import type {
  FoundExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { Ecs } from '../../../../../common/ecs';

import {
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_EVENT_FILTERS_NAMESPACE,
} from '../../../common/constants';

import { eventFiltersPageReducer } from '../store/reducer';
import {
  httpHandlerMockFactory,
  ResponseProvidersInterface,
} from '../../../../common/mock/endpoint/http_handler_mock_factory';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';

export const createGlobalNoMiddlewareStore = () => {
  return createStore(
    combineReducers({
      [MANAGEMENT_STORE_GLOBAL_NAMESPACE]: combineReducers({
        [MANAGEMENT_STORE_EVENT_FILTERS_NAMESPACE]: eventFiltersPageReducer,
      }),
    })
  );
};

export const ecsEventMock = (): Ecs => ({
  _id: 'unLfz3gB2mJZsMY3ytx3',
  timestamp: '2021-04-14T15:34:15.330Z',
  _index: '.ds-logs-endpoint.events.process-default-2021.04.12-000001',
  event: {
    category: ['network'],
    id: ['2c4f51be-7736-4ab8-a255-54e7023c4653'],
    kind: ['event'],
    type: ['start'],
  },
  host: {
    name: ['Host-tvs68wo3qc'],
    os: {
      family: ['windows'],
    },
    id: ['a563b365-2bee-40df-adcd-ae84d889f523'],
    ip: ['10.242.233.187'],
  },
  user: {
    name: ['uegem17ws4'],
    domain: ['hr8jofpkxp'],
  },
  agent: {
    type: ['endpoint'],
  },
  process: {
    hash: {
      md5: ['c4653870-99b8-4f36-abde-24812d08a289'],
    },
    parent: {
      pid: [4852],
    },
    pid: [3652],
    name: ['lsass.exe'],
    args: ['"C:\\lsass.exe" \\6z9'],
    entity_id: ['9qotd1i8rf'],
    executable: ['C:\\lsass.exe'],
  },
});

export const createdEventFilterEntryMock = (): ExceptionListItemSchema => ({
  _version: 'WzM4MDgsMV0=',
  meta: undefined,
  comments: [],
  created_at: '2021-04-19T10:30:36.425Z',
  created_by: 'elastic',
  description: '',
  entries: [
    { field: 'event.category', operator: 'included', type: 'match', value: 'process' },
    { field: 'process.executable', operator: 'included', type: 'match', value: 'C:\\iexlorer.exe' },
  ],
  id: '47598790-a0fa-11eb-8458-69ac85f1fa18',
  item_id: '93f65a04-6f5c-4f9e-9be5-e674b3c2392f',
  list_id: '.endpointEventFilterList',
  name: 'Test',
  namespace_type: 'agnostic',
  os_types: ['windows'],
  tags: ['policy:all'],
  tie_breaker_id: 'c42f3dbd-292f-49e8-83ab-158d024a4d8b',
  type: 'simple',
  updated_at: '2021-04-19T10:30:36.428Z',
  updated_by: 'elastic',
});

export type EventFiltersListQueryHttpMockProviders = ResponseProvidersInterface<{
  eventFiltersList: () => FoundExceptionListItemSchema;
  eventFiltersCreateList: () => ExceptionListItemSchema;
}>;

/**
 * Mock `core.http` methods used by Event Filters List page
 */
export const eventFiltersListQueryHttpMock = httpHandlerMockFactory<EventFiltersListQueryHttpMockProviders>(
  [
    {
      id: 'eventFiltersCreateList',
      method: 'post',
      path: EXCEPTION_LIST_URL,
      handler: () => {
        return getExceptionListItemSchemaMock();
      },
    },
    {
      id: 'eventFiltersList',
      method: 'get',
      path: `${EXCEPTION_LIST_ITEM_URL}/_find`,
      handler: (): FoundExceptionListItemSchema => {
        return getFoundExceptionListItemSchemaMock();
      },
    },
  ]
);
