/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyncStatus, ConnectorStatus } from '../../../../common/types/connectors';

import {
  ApiViewIndex,
  ConnectorViewIndex,
  CrawlerViewIndex,
  IngestionMethod,
  IngestionStatus,
} from '../types';

export const apiIndex: ApiViewIndex = {
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
    configuration: {},
    id: '2',
    index_name: 'connector',
    last_seen: null,
    last_sync_error: null,
    last_sync_status: SyncStatus.COMPLETED,
    last_synced: null,
    scheduling: {
      enabled: false,
      interval: '',
    },
    service_type: null,
    status: ConnectorStatus.CONFIGURED,
    sync_now: false,
  },
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
  crawler: {
    id: '3',
    index_name: 'crawler',
  },
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

export const elasticsearchViewIndices = [apiIndex, connectorIndex, crawlerIndex];
