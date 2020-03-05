/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
  DATASOURCE_SAVED_OBJECT_TYPE,
  PACKAGES_SAVED_OBJECT_TYPE,
  AGENT_SAVED_OBJECT_TYPE,
  AGENT_EVENT_SAVED_OBJECT_TYPE,
  ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE,
} from './constants';

/*
 * Saved object mappings
 *
 * Please update typings in `/common/types` if mappings are updated.
 */
export const savedObjectMappings = {
  [AGENT_SAVED_OBJECT_TYPE]: {
    properties: {
      shared_id: { type: 'keyword' },
      type: { type: 'keyword' },
      active: { type: 'boolean' },
      enrolled_at: { type: 'date' },
      access_api_key_id: { type: 'keyword' },
      version: { type: 'keyword' },
      user_provided_metadata: { type: 'text' },
      local_metadata: { type: 'text' },
      config_id: { type: 'keyword' },
      last_updated: { type: 'date' },
      last_checkin: { type: 'date' },
      config_updated_at: { type: 'date' },
      // FIXME_INGEST https://github.com/elastic/kibana/issues/56554
      default_api_key: { type: 'keyword' },
      updated_at: { type: 'date' },
      current_error_events: { type: 'text' },
      // FIXME_INGEST https://github.com/elastic/kibana/issues/56554
      actions: {
        type: 'nested',
        properties: {
          id: { type: 'keyword' },
          type: { type: 'keyword' },
          data: { type: 'text' },
          sent_at: { type: 'date' },
          created_at: { type: 'date' },
        },
      },
    },
  },
  [AGENT_EVENT_SAVED_OBJECT_TYPE]: {
    properties: {
      type: { type: 'keyword' },
      subtype: { type: 'keyword' },
      agent_id: { type: 'keyword' },
      action_id: { type: 'keyword' },
      config_id: { type: 'keyword' },
      stream_id: { type: 'keyword' },
      timestamp: { type: 'date' },
      message: { type: 'text' },
      payload: { type: 'text' },
      data: { type: 'text' },
    },
  },
  [AGENT_CONFIG_SAVED_OBJECT_TYPE]: {
    properties: {
      id: { type: 'keyword' },
      name: { type: 'text' },
      is_default: { type: 'boolean' },
      namespace: { type: 'keyword' },
      description: { type: 'text' },
      status: { type: 'keyword' },
      datasources: { type: 'keyword' },
      updated_on: { type: 'keyword' },
      updated_by: { type: 'keyword' },
    },
  },
  [ENROLLMENT_API_KEYS_SAVED_OBJECT_TYPE]: {
    properties: {
      name: { type: 'keyword' },
      type: { type: 'keyword' },
      // FIXME_INGEST https://github.com/elastic/kibana/issues/56554
      api_key: { type: 'binary' },
      api_key_id: { type: 'keyword' },
      config_id: { type: 'keyword' },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
      expire_at: { type: 'date' },
      active: { type: 'boolean' },
    },
  },
  [OUTPUT_SAVED_OBJECT_TYPE]: {
    properties: {
      name: { type: 'keyword' },
      type: { type: 'keyword' },
      is_default: { type: 'boolean' },
      hosts: { type: 'keyword' },
      ca_sha256: { type: 'keyword' },
      // FIXME_INGEST https://github.com/elastic/kibana/issues/56554
      api_key: { type: 'keyword' },
      admin_username: { type: 'binary' },
      admin_password: { type: 'binary' },
      config: { type: 'flattened' },
    },
  },
  [DATASOURCE_SAVED_OBJECT_TYPE]: {
    properties: {
      name: { type: 'keyword' },
      namespace: { type: 'keyword' },
      config_id: { type: 'keyword' },
      enabled: { type: 'boolean' },
      package: {
        properties: {
          assets: {
            properties: {
              id: { type: 'keyword' },
              type: { type: 'keyword' },
            },
          },
          description: { type: 'keyword' },
          name: { type: 'keyword' },
          title: { type: 'keyword' },
          version: { type: 'keyword' },
        },
      },
      output_id: { type: 'keyword' },
      inputs: {
        type: 'nested',
        properties: {
          type: { type: 'keyword' },
          enabled: { type: 'boolean' },
          processors: { type: 'keyword' },
          streams: {
            type: 'nested',
            properties: {
              id: { type: 'keyword' },
              enabled: { type: 'boolean' },
              dataset: { type: 'keyword' },
              processors: { type: 'keyword' },
              config: { type: 'flattened' },
            },
          },
        },
      },
    },
  },
  [PACKAGES_SAVED_OBJECT_TYPE]: {
    properties: {
      name: { type: 'keyword' },
      version: { type: 'keyword' },
      installed: {
        type: 'nested',
        properties: {
          id: { type: 'keyword' },
          type: { type: 'keyword' },
        },
      },
    },
  },
};
