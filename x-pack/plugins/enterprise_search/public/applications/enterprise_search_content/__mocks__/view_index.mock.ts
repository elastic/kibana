/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../../../common/constants';

import {
  SyncStatus,
  ConnectorStatus,
  FilteringPolicy,
  FilteringRuleRule,
  FilteringValidationState,
} from '../../../../common/types/connectors';

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
    features: null,
    filtering: [
      {
        active: {
          advanced_snippet: {
            created_at: expect.any(String),
            updated_at: expect.any(String),
            value: {},
          },
          rules: [
            {
              created_at: expect.any(String),
              field: '_',
              id: 'DEFAULT',
              order: 0,
              policy: FilteringPolicy.INCLUDE,
              rule: FilteringRuleRule.REGEX,
              updated_at: expect.any(String),
              value: '.*',
            },
          ],
          validation: {
            errors: [],
            state: FilteringValidationState.VALID,
          },
        },
        domain: 'DEFAULT',
        draft: {
          advanced_snippet: {
            created_at: expect.any(String),
            updated_at: expect.any(String),
            value: {},
          },
          rules: [
            {
              created_at: expect.any(String),
              field: '_',
              id: 'DEFAULT',
              order: 0,
              policy: FilteringPolicy.INCLUDE,
              rule: FilteringRuleRule.REGEX,
              updated_at: expect.any(String),
              value: '.*',
            },
          ],
          validation: {
            errors: [],
            state: FilteringValidationState.VALID,
          },
        },
      },
    ],
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
  ingestionStatus: IngestionStatus.CONFIGURED,
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
  connector: {
    api_key_id: null,
    configuration: { foo: { label: 'bar', value: 'barbar' } },
    description: null,
    error: null,
    features: null,
    filtering: [
      {
        active: {
          advanced_snippet: {
            created_at: expect.any(String),
            updated_at: expect.any(String),
            value: {},
          },
          rules: [
            {
              created_at: expect.any(String),
              field: '_',
              id: 'DEFAULT',
              order: 0,
              policy: FilteringPolicy.INCLUDE,
              rule: FilteringRuleRule.REGEX,
              updated_at: expect.any(String),
              value: '.*',
            },
          ],
          validation: {
            errors: [],
            state: FilteringValidationState.VALID,
          },
        },
        domain: 'DEFAULT',
        draft: {
          advanced_snippet: {
            created_at: expect.any(String),
            updated_at: expect.any(String),
            value: {},
          },
          rules: [
            {
              created_at: expect.any(String),
              field: '_',
              id: 'DEFAULT',
              order: 0,
              policy: FilteringPolicy.INCLUDE,
              rule: FilteringRuleRule.REGEX,
              updated_at: expect.any(String),
              value: '.*',
            },
          ],
          validation: {
            errors: [],
            state: FilteringValidationState.VALID,
          },
        },
      },
    ],
    id: '4',
    index_name: 'crawler',
    is_native: true,
    language: 'en',
    last_seen: null,
    last_sync_error: null,
    last_sync_status: SyncStatus.COMPLETED,
    last_synced: null,
    name: 'crawler',
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
    index_name: 'connector-crawler',
  },
  hidden: false,
  ingestionMethod: IngestionMethod.CRAWLER,
  ingestionStatus: IngestionStatus.CONFIGURED,
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
