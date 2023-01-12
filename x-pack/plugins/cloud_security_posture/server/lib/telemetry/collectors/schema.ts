/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { CspmUsage } from './types';

export const cspmUsageSchema: MakeSchemaFrom<CspmUsage> = {
  indices: {
    findings: {
      doc_count: {
        type: 'long',
      },
      deleted: {
        type: 'long',
      },
      size_in_bytes: {
        type: 'long',
      },
      last_doc_timestamp: {
        type: 'date',
      },
    },
    latest_findings: {
      doc_count: {
        type: 'long',
      },
      deleted: {
        type: 'long',
      },
      size_in_bytes: {
        type: 'long',
      },
      last_doc_timestamp: {
        type: 'date',
      },
    },
    score: {
      doc_count: {
        type: 'long',
      },
      deleted: {
        type: 'long',
      },
      size_in_bytes: {
        type: 'long',
      },
      last_doc_timestamp: {
        type: 'date',
      },
    },
  },
  resources_stats: {
    type: 'array',
    items: {
      account_id: { type: 'keyword' },
      resource_type: { type: 'keyword' },
      resource_type_doc_count: { type: 'long' },
      resource_sub_type: { type: 'keyword' },
      resource_sub_type_doc_count: { type: 'long' },
      passed_findings_count: { type: 'long' },
      failed_findings_count: { type: 'long' },
    },
  },
  accounts_stats: {
    type: 'array',
    items: {
      account_id: { type: 'keyword' },
      posture_score: { type: 'long' },
      latest_findings_doc_count: { type: 'long' },
      benchmark_id: { type: 'keyword' },
      benchmark_name: { type: 'keyword' },
      benchmark_version: { type: 'keyword' },
      passed_findings_count: { type: 'long' },
      failed_findings_count: { type: 'long' },
      agents_count: { type: 'short' },
      nodes_count: { type: 'short' },
      pods_count: { type: 'short' },
    },
  },
};
