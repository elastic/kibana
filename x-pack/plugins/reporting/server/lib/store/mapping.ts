/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mapping = {
  meta: {
    // We are indexing these properties with both text and keyword fields
    // because that's what will be auto generated when an index already exists.
    properties: {
      // ID of the app this report: search, visualization or dashboard, etc
      objectType: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      layout: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      isDeprecated: {
        type: 'boolean',
      },
    },
  },
  browser_type: { type: 'keyword' },
  migration_version: { type: 'keyword' }, // new field (7.14) to distinguish reports that were scheduled with Task Manager
  jobtype: { type: 'keyword' },
  payload: { type: 'object', enabled: false },
  priority: { type: 'byte' }, // TODO: remove: this is unused
  timeout: { type: 'long' },
  process_expiration: { type: 'date' },
  created_by: { type: 'keyword' }, // `null` if security is disabled
  created_at: { type: 'date' },
  started_at: { type: 'date' },
  completed_at: { type: 'date' },
  attempts: { type: 'short' },
  max_attempts: { type: 'short' },
  kibana_name: { type: 'keyword' },
  kibana_id: { type: 'keyword' },
  status: { type: 'keyword' },
  parent_id: { type: 'keyword' },
  output: {
    type: 'object',
    properties: {
      chunk: { type: 'long' },
      content_type: { type: 'keyword' },
      size: { type: 'long' },
      content: { type: 'object', enabled: false },
    },
  },
} as const;
