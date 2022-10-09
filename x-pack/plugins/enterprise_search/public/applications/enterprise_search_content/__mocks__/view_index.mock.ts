/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../../../common/constants';

import { SyncStatus, ConnectorStatus } from '../../../../common/types/connectors';

import {
  ApiViewIndex,
  ConnectorViewIndex,
  CrawlerViewIndex,
  IngestionMethod,
  IngestionStatus,
} from '../types';

export const apiIndex: ApiViewIndex = {
  count: 1,
  hidden: false,
  ingestionMethod: IngestionMethod.API,
  ingestionStatus: IngestionStatus.CONNECTED,
  lastUpdated: null,
  name: 'api',
  total: {
    docs: {
      count: 1,
      deleted: 0,
    },
    store: { size_in_bytes: '8024' },
  },
};
export const connectorIndex: ConnectorViewIndex = {
  connector: {
    api_key_id: null,
    configuration: { foo: { label: 'bar', value: 'barbar' } },
    description: null,
    error: null,
    id: '2',
    index_name: 'connector',
    is_native: false,
    language: 'en',
    last_seen: null,
    last_sync_error: null,
    last_sync_status: SyncStatus.COMPLETED,
    last_synced: null,
    name: 'connector',
    scheduling: {
      enabled: false,
      interval: '',
    },
    service_type: null,
    status: ConnectorStatus.CONFIGURED,
    sync_now: false,
  },
  count: 1,
  hidden: false,
  ingestionMethod: IngestionMethod.CONNECTOR,
  ingestionStatus: IngestionStatus.INCOMPLETE,
  lastUpdated: 'never',
  name: 'connector',
  total: {
    docs: {
      count: 1,
      deleted: 0,
    },
    store: { size_in_bytes: '8024' },
  },
};
export const crawlerIndex: CrawlerViewIndex = {
  count: 1,
  crawler: {
    id: '3',
    index_name: 'crawler',
  },
  hidden: false,
  ingestionMethod: IngestionMethod.CRAWLER,
  ingestionStatus: IngestionStatus.INCOMPLETE,
  lastUpdated: null,
  name: 'crawler',
  total: {
    docs: {
      count: 1,
      deleted: 0,
    },
    store: { size_in_bytes: '8024' },
  },
};
export const connectorCrawlerIndex: CrawlerViewIndex = {
  connector: {
    api_key_id: null,
    configuration: { foo: { label: 'bar', value: 'barbar' } },
    description: null,
    error: null,
    id: '4',
    index_name: 'connector-crawler',
    is_native: true,
    language: 'en',
    last_seen: null,
    last_sync_error: null,
    last_sync_status: SyncStatus.COMPLETED,
    last_synced: null,
    name: 'connector-crawler',
    scheduling: {
      enabled: false,
      interval: '',
    },
    service_type: ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE,
    status: ConnectorStatus.CONFIGURED,
    sync_now: false,
  },
  count: 1,
  crawler: {
    id: '5',
    index_name: 'crawler',
  },
  hidden: false,
  ingestionMethod: IngestionMethod.CRAWLER,
  ingestionStatus: IngestionStatus.INCOMPLETE,
  lastUpdated: null,
  name: 'connector-crawler',
  total: {
    docs: {
      count: 1,
      deleted: 0,
    },
    store: { size_in_bytes: '8024' },
  },
};

export const elasticsearchViewIndices = [
  apiIndex,
  connectorIndex,
  crawlerIndex,
  connectorCrawlerIndex,
];
