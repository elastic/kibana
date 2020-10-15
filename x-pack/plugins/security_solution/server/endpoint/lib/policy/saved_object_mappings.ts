/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsType } from '../../../../../../../src/core/server/types';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../../ingest_manager/common';
import { migratePackagePolicyToV7110 } from './to_v7_11.0';

export const packagePolicyType: SavedObjectsType = {
  name: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'agnostic',
  management: {
    importableAndExportable: false,
  },
  mappings: {
    properties: {
      name: { type: 'keyword' },
      description: { type: 'text' },
      namespace: { type: 'keyword' },
      enabled: { type: 'boolean' },
      policy_id: { type: 'keyword' },
      output_id: { type: 'keyword' },
      package: {
        properties: {
          name: { type: 'keyword' },
          title: { type: 'keyword' },
          version: { type: 'keyword' },
        },
      },
      inputs: {
        type: 'nested',
        enabled: false,
        properties: {
          type: { type: 'keyword' },
          enabled: { type: 'boolean' },
          vars: { type: 'flattened' },
          config: { type: 'flattened' },
          streams: {
            type: 'nested',
            properties: {
              id: { type: 'keyword' },
              enabled: { type: 'boolean' },
              data_stream: {
                properties: {
                  dataset: { type: 'keyword' },
                  type: { type: 'keyword' },
                },
              },
              vars: { type: 'flattened' },
              config: { type: 'flattened' },
              compiled_stream: { type: 'flattened' },
            },
          },
        },
      },
      revision: { type: 'integer' },
      updated_at: { type: 'date' },
      updated_by: { type: 'keyword' },
      created_at: { type: 'date' },
      created_by: { type: 'keyword' },
    },
  },
  migrations: {
    '7.11.0': migratePackagePolicyToV7110,
  },
};
