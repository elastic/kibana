/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorStatus, SyncStatus } from '../../../../common/types/connectors';
import { ElasticsearchIndexWithIngestion } from '../../../../common/types/indices';

export const indices: ElasticsearchIndexWithIngestion[] = [
  {
    count: 1,
    hidden: false,
    name: 'api',
    total: {
      docs: {
        count: 1,
        deleted: 0,
      },
      store: { size_in_bytes: '8024' },
    },
  },
  {
    connector: {
      api_key_id: null,
      configuration: { foo: { label: 'bar', value: 'barbar' } },
      id: '2',
      index_name: 'connector',
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
    name: 'connector',
    total: {
      docs: {
        count: 1,
        deleted: 0,
      },
      store: { size_in_bytes: '8024' },
    },
  },
  {
    count: 1,
    crawler: {
      id: '3',
      index_name: 'crawler',
    },
    hidden: false,
    name: 'crawler',
    total: {
      docs: {
        count: 1,
        deleted: 0,
      },
      store: { size_in_bytes: '8024' },
    },
  },
];
