/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mapping = {
  meta: {
    // We are indexing these properties with both text and keyword fields because that's what will be auto generated
    // when an index already exists. This schema is only used when a reporting index doesn't exist.  This way existing
    // reporting indexes and new reporting indexes will look the same and the data can be queried in the same
    // manner.
    properties: {
      /**
       * Type of object that is triggering this report. Should be either search, visualization or dashboard.
       * Used for job listing and telemetry stats only.
       */
      objectType: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      /**
       * Can be either preserve_layout, print or none (in the case of csv export).
       * Used for phone home stats only.
       */
      layout: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
    },
  },
  browser_type: { type: 'keyword' },
  jobtype: { type: 'keyword' },
  payload: { type: 'object', enabled: false },
  priority: { type: 'byte' },
  timeout: { type: 'long' },
  process_expiration: { type: 'date' },
  created_by: { type: 'keyword' },
  created_at: { type: 'date' },
  started_at: { type: 'date' },
  completed_at: { type: 'date' },
  attempts: { type: 'short' },
  max_attempts: { type: 'short' },
  kibana_name: { type: 'keyword' },
  kibana_id: { type: 'keyword' },
  status: { type: 'keyword' },
  output: {
    type: 'object',
    properties: {
      content_type: { type: 'keyword' },
      size: { type: 'long' },
      content: { type: 'object', enabled: false },
    },
  },
};
