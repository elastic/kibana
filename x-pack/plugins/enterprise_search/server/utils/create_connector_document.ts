/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NATIVE_CONNECTOR_DEFINITIONS } from '../../common/connectors/native_connectors';
import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../common/constants';

import {
  ConnectorDocument,
  ConnectorStatus,
  FilteringPolicy,
  FilteringRuleRule,
  FilteringValidationState,
  IngestPipelineParams,
} from '../../common/types/connectors';
import { stripSearchPrefix } from '../../common/utils/strip_search_prefix';

export function createConnectorDocument({
  indexName,
  isNative,
  name,
  pipeline,
  serviceType,
  language,
}: {
  indexName: string | null;
  isNative: boolean;
  language: string | null;
  name?: string;
  pipeline?: IngestPipelineParams | null;
  serviceType: string | null;
}): ConnectorDocument {
  const currentTimestamp = new Date().toISOString();
  const nativeConnector =
    isNative && serviceType ? NATIVE_CONNECTOR_DEFINITIONS[serviceType] : undefined;

  if (
    isNative &&
    serviceType &&
    !nativeConnector &&
    serviceType !== ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE
  ) {
    throw new Error(`Could not find connector definition for service type ${serviceType}`);
  }

  const nativeFields = nativeConnector
    ? {
        configuration: nativeConnector.configuration,
        features: nativeConnector.features,
        name: nativeConnector.name,
        service_type: serviceType,
        status: ConnectorStatus.NEEDS_CONFIGURATION,
      }
    : {};

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
    last_access_control_sync_error: null,
    last_access_control_sync_scheduled_at: null,
    last_access_control_sync_status: null,
    last_incremental_sync_scheduled_at: null,
    last_seen: null,
    last_sync_error: null,
    last_sync_scheduled_at: null,
    last_sync_status: null,
    last_synced: null,
    name: name || stripSearchPrefix(indexName ?? ''),
    pipeline,
    scheduling: {
      access_control: { enabled: false, interval: '0 0 0 * * ?' },
      full: { enabled: false, interval: '0 0 0 * * ?' },
      incremental: { enabled: false, interval: '0 0 0 * * ?' },
    },
    service_type: serviceType || null,
    status: ConnectorStatus.CREATED,
    sync_now: false,
    ...nativeFields,
  };
}
