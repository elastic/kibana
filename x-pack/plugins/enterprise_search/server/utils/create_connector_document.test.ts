/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorStatus } from '../../common/types/connectors';

import { createConnectorDocument } from './create_connector_document';

describe('createConnectorDocument', () => {
  it('should create a connector document', () => {
    expect(
      createConnectorDocument({
        indexName: 'indexName',
        isNative: false,
        language: 'fr',
        pipeline: {
          extract_binary_content: true,
          name: 'ent-search-generic-ingestion',
          reduce_whitespace: true,
          run_ml_inference: false,
        },
        serviceType: null,
      })
    ).toEqual({
      api_key_id: null,
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
      language: 'fr',
      last_access_control_sync_error: null,
      last_access_control_sync_scheduled_at: null,
      last_access_control_sync_status: null,
      last_incremental_sync_scheduled_at: null,
      last_seen: null,
      last_sync_error: null,
      last_sync_scheduled_at: null,
      last_sync_status: null,
      last_synced: null,
      name: 'indexName',
      pipeline: {
        extract_binary_content: true,
        name: 'ent-search-generic-ingestion',
        reduce_whitespace: true,
        run_ml_inference: false,
      },
      scheduling: {
        access_control: { enabled: false, interval: '0 0 0 * * ?' },
        full: { enabled: false, interval: '0 0 0 * * ?' },
        incremental: { enabled: false, interval: '0 0 0 * * ?' },
      },
      service_type: null,
      status: ConnectorStatus.CREATED,
      sync_now: false,
    });
  });
  it('should remove search- from name', () => {
    expect(
      createConnectorDocument({
        indexName: 'search-indexName',
        isNative: false,
        language: 'fr',
        pipeline: {
          extract_binary_content: true,
          name: 'ent-search-generic-ingestion',
          reduce_whitespace: true,
          run_ml_inference: false,
        },
        serviceType: null,
      })
    ).toEqual({
      api_key_id: null,
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
      index_name: 'search-indexName',
      is_native: false,
      language: 'fr',
      last_access_control_sync_error: null,
      last_access_control_sync_scheduled_at: null,
      last_access_control_sync_status: null,
      last_incremental_sync_scheduled_at: null,
      last_seen: null,
      last_sync_error: null,
      last_sync_scheduled_at: null,
      last_sync_status: null,
      last_synced: null,
      name: 'indexName',
      pipeline: {
        extract_binary_content: true,
        name: 'ent-search-generic-ingestion',
        reduce_whitespace: true,
        run_ml_inference: false,
      },
      scheduling: {
        access_control: { enabled: false, interval: '0 0 0 * * ?' },
        full: { enabled: false, interval: '0 0 0 * * ?' },
        incremental: { enabled: false, interval: '0 0 0 * * ?' },
      },
      service_type: null,
      status: ConnectorStatus.CREATED,
      sync_now: false,
    });
  });
});
