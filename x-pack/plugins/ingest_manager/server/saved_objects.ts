/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  OUTPUT_SAVED_OBJECT_TYPE,
  AGENT_CONFIG_SAVED_OBJECT_TYPE,
  DATA_STREAM_SAVED_OBJECT_TYPE,
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
      label: { type: 'keyword' },
      description: { type: 'text' },
      status: { type: 'keyword' },
      data_streams: { type: 'keyword' },
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
      config: { type: 'flattened' },
    },
  },
  [DATA_STREAM_SAVED_OBJECT_TYPE]: {
    properties: {
      id: { type: 'keyword' },
      name: { type: 'keyword' },
      read_alias: { type: 'keyword' },
      input: {
        properties: {
          type: { type: 'keyword' },
          config: { type: 'flattened' },
          fields: { type: 'flattened' },
          ilm_policy: { type: 'keyword' },
          index_template: { type: 'keyword' },
          ingest_pipelines: { type: 'keyword' },
        },
      },
      output_id: { type: 'keyword' },
      processors: { type: 'keyword' },
      config: { type: 'flattened' },
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
    },
  },
};
