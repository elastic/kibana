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
  ExceptionListSummarySchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { getFoundExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/found_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getSummaryExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_summary_schema.mock';
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
      name: ['Windows'],
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
  eventFiltersGetOne: () => ExceptionListItemSchema;
  eventFiltersCreateOne: () => ExceptionListItemSchema;
  eventFiltersUpdateOne: () => ExceptionListItemSchema;
  eventFiltersGetSummary: () => ExceptionListSummarySchema;
}>;

export const esResponseData = () => ({
  rawResponse: {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: 1,
      max_score: 1,
      hits: [
        {
          _index: '.ds-logs-endpoint.events.process-default-2021.07.06-000001',
          _id: 'ZihXfHoBP7UhLrksX9-B',
          _score: 1,
          _source: {
            agent: {
              id: '9b5fad11-6cd9-401b-afc1-1c2b0c8a2603',
              type: 'endpoint',
              version: '7.12.2',
            },
            process: {
              args: '"C:\\lsass.exe" \\d6e',
              Ext: {
                ancestry: ['wm6pfs8yo3', 'd0zpkp91jx'],
              },
              parent: {
                pid: 2356,
                entity_id: 'wm6pfs8yo3',
              },
              code_signature: {
                subject_name: 'Microsoft',
                status: 'trusted',
              },
              name: 'lsass.exe',
              pid: 2522,
              entity_id: 'hmmlst1ewe',
              executable: 'C:\\lsass.exe',
              hash: {
                md5: 'de8c03a1-099f-4d9b-9a5e-1961c18af19f',
              },
            },
            network: {
              forwarded_ip: '10.105.19.209',
              direction: 'inbound',
            },
            '@timestamp': 1625694621727,
            ecs: {
              version: '1.4.0',
            },
            data_stream: {
              namespace: 'default',
              type: 'logs',
              dataset: 'endpoint.events.process',
            },
            host: {
              hostname: 'Host-15ofk0qkwk',
              os: {
                Ext: {
                  variant: 'Windows Pro',
                },
                name: 'Linux',
                family: 'Debian OS',
                version: '10.0',
                platform: 'Windows',
                full: 'Windows 10',
              },
              ip: ['10.133.4.77', '10.135.101.75', '10.137.102.119'],
              name: 'Host-15ofk0qkwk',
              id: 'bae7a849-1ce9-421a-a879-5fee5dcd1fb9',
              mac: ['ad-65-2d-17-aa-95', '63-4-33-c5-c6-90'],
              architecture: 'uwp8xmxk1f',
            },
            event: {
              agent_id_status: 'auth_metadata_missing',
              sequence: 36,
              ingested: '2021-07-06T15:02:18.746828Z',
              kind: 'event',
              id: '02057ac0-0ae5-442c-9082-c5a7489dde09',
              category: 'network',
              type: 'start',
            },
            user: {
              domain: '22bk8yptgw',
              name: 'dlkfiz43rh',
            },
          },
        },
      ],
    },
  },
  isPartial: false,
  isRunning: false,
  total: 1,
  loaded: 1,
  isRestored: false,
});

/**
 * Mock `core.http` methods used by Event Filters List page
 */
export const eventFiltersListQueryHttpMock =
  httpHandlerMockFactory<EventFiltersListQueryHttpMockProviders>([
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
    {
      id: 'eventFiltersGetOne',
      method: 'get',
      path: `${EXCEPTION_LIST_ITEM_URL}`,
      handler: (): ExceptionListItemSchema => {
        return getExceptionListItemSchemaMock();
      },
    },
    {
      id: 'eventFiltersCreateOne',
      method: 'post',
      path: `${EXCEPTION_LIST_ITEM_URL}`,
      handler: (): ExceptionListItemSchema => {
        return getExceptionListItemSchemaMock();
      },
    },
    {
      id: 'eventFiltersUpdateOne',
      method: 'put',
      path: `${EXCEPTION_LIST_ITEM_URL}`,
      handler: (): ExceptionListItemSchema => {
        return getExceptionListItemSchemaMock();
      },
    },
    {
      id: 'eventFiltersGetSummary',
      method: 'get',
      path: `${EXCEPTION_LIST_URL}/summary`,
      handler: (): ExceptionListSummarySchema => {
        return getSummaryExceptionListSchemaMock();
      },
    },
  ]);
