/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConnectorDocument,
  ConnectorStatus,
  FilteringPolicy,
  FilteringRuleRule,
  FilteringValidationState,
  IngestPipelineParams,
} from '../../common/types/connectors';

export function createConnectorDocument({
  indexName,
  isNative,
  pipeline,
  serviceType,
  language,
}: {
  indexName: string;
  isNative: boolean;
  language: string | null;
  pipeline?: IngestPipelineParams | null;
  serviceType?: string | null;
}): ConnectorDocument {
  const currentTimestamp = new Date().toISOString();
  return {
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
            created_at: currentTimestamp,
            updated_at: currentTimestamp,
            value: {},
          },
          rules: [
            {
              created_at: currentTimestamp,
              field: '_',
              id: 'DEFAULT',
              order: 0,
              policy: FilteringPolicy.INCLUDE,
              rule: FilteringRuleRule.REGEX,
              updated_at: currentTimestamp,
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
            created_at: currentTimestamp,
            updated_at: currentTimestamp,
            value: {},
          },
          rules: [
            {
              created_at: currentTimestamp,
              field: '_',
              id: 'DEFAULT',
              order: 0,
              policy: FilteringPolicy.INCLUDE,
              rule: FilteringRuleRule.REGEX,
              updated_at: currentTimestamp,
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
    index_name: indexName,
    is_native: isNative,
    language,
    last_seen: null,
    last_sync_error: null,
    last_sync_status: null,
    last_synced: null,
    name: indexName.startsWith('search-') ? indexName.substring(7) : indexName,
    pipeline,
    scheduling: { enabled: false, interval: '0 0 0 * * ?' },
    service_type: serviceType || null,
    status: ConnectorStatus.CREATED,
    sync_now: false,
  };
}
