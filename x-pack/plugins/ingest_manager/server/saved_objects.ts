/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
  DATASOURCE_SAVED_OBJECT_TYPE,
} from './constants';

/*
 * Saved object mappings
 *
 * Please update typings in `/common/types` if mappings are updated.
 */
export const savedObjectMappings = {
  [AGENT_CONFIG_SAVED_OBJECT_TYPE]: {
    properties: {
      id: { type: 'keyword' },
      name: { type: 'text' },
      namespace: { type: 'keyword' },
      description: { type: 'text' },
      status: { type: 'keyword' },
      datasources: { type: 'keyword' },
      updated_on: { type: 'keyword' },
      updated_by: { type: 'keyword' },
    },
  },
  [OUTPUT_SAVED_OBJECT_TYPE]: {
    properties: {
      id: { type: 'keyword' },
      name: { type: 'keyword' },
      type: { type: 'keyword' },
      username: { type: 'keyword' },
      password: { type: 'keyword' },
      index_name: { type: 'keyword' },
      ingest_pipeline: { type: 'keyword' },
      hosts: { type: 'keyword' },
      api_key: { type: 'keyword' },
      admin_username: { type: 'binary' },
      admin_password: { type: 'binary' },
      config: { type: 'flattened' },
    },
  },
  [DATASOURCE_SAVED_OBJECT_TYPE]: {
    properties: {
      id: { type: 'keyword' },
      name: { type: 'keyword' },
      namespace: { type: 'keyword' },
      read_alias: { type: 'keyword' },
      agent_config_id: { type: 'keyword' },
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
      streams: {
        properties: {
          config: { type: 'flattened' },
          id: { type: 'keyword' },
          input: { type: 'flattened' },
          output_id: { type: 'keyword' },
          processors: { type: 'keyword' },
        },
      },
    },
  },
};
