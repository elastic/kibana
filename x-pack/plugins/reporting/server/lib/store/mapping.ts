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
      error_code: { type: 'keyword' },
      chunk: { type: 'long' },
      content_type: { type: 'keyword' },
      size: { type: 'long' },
      content: { type: 'object', enabled: false },
    },
  },
  metrics: {
    type: 'object',
    properties: {
      csv: {
        type: 'object',
        properties: {
          rows: { type: 'long' },
        },
      },
      pdf: {
        type: 'object',
        properties: {
          pages: { type: 'long' },
          cpu: { type: 'double' },
          cpuInPercentage: { type: 'double' },
          memory: { type: 'long' },
          memoryInMegabytes: { type: 'double' },
        },
      },
      png: {
        type: 'object',
        properties: {
          cpu: { type: 'double' },
          cpuInPercentage: { type: 'double' },
          memory: { type: 'long' },
          memoryInMegabytes: { type: 'double' },
        },
      },
    },
  },
} as const;
