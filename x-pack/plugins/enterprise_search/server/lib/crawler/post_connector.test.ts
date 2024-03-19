/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { CONNECTORS_INDEX, ConnectorStatus } from '@kbn/search-connectors';

import { recreateConnectorDocument } from './post_connector';

describe('recreateConnectorDocument lib function', () => {
  const mockClient = {
    asCurrentUser: {
      index: jest.fn(),
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should recreate connector document', async () => {
    mockClient.asCurrentUser.index.mockResolvedValue({ _id: 'connectorId' });

    await recreateConnectorDocument(mockClient as unknown as IScopedClusterClient, 'indexName');
    expect(mockClient.asCurrentUser.index).toHaveBeenCalledWith({
      document: {
        api_key_id: null,
        api_key_secret_id: null,
        configuration: {},
        custom_scheduling: {},
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
                  policy: 'include',
                  rule: 'regex',
                  updated_at: expect.any(String),
                  value: '.*',
                },
              ],
              validation: {
                errors: [],
                state: 'valid',
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
                  policy: 'include',
                  rule: 'regex',
                  updated_at: expect.any(String),
                  value: '.*',
                },
              ],
              validation: {
                errors: [],
                state: 'valid',
              },
            },
          },
        ],
        index_name: 'indexName',
        is_native: false,
        language: '',
        last_access_control_sync_error: null,
        last_access_control_sync_scheduled_at: null,
        last_access_control_sync_status: null,
        last_deleted_document_count: null,
        last_incremental_sync_scheduled_at: null,
        last_indexed_document_count: null,
        last_seen: null,
        last_sync_error: null,
        last_sync_scheduled_at: null,
        last_sync_status: null,
        last_synced: null,
        name: 'indexName',
        pipeline: null,
        scheduling: {
          access_control: { enabled: false, interval: '0 0 0 * * ?' },
          full: { enabled: false, interval: '0 0 0 * * ?' },
          incremental: { enabled: false, interval: '0 0 0 * * ?' },
        },
        service_type: 'elastic-crawler',
        status: ConnectorStatus.CONFIGURED,
        sync_now: false,
      },
      index: CONNECTORS_INDEX,
      refresh: 'wait_for',
    });
  });
});
