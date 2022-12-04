/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { CspmUsage, ResourceStats } from './types';

const byResourceType: MakeSchemaFrom<ResourceStats[string]> = {
  doc_count: { type: 'long' },
  passed: { type: 'long' },
  failed: { type: 'long' },
};

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
  accounts: {
    type: 'array',
    items: {
      account_id: { type: 'keyword' },
      latest_findings_doc_count: { type: 'long' },
      agents_count: { type: 'long' },
      account_score: { type: 'float' },
      resource_type: {
        // byResourceType,
        DYNAMIC_KEY: {
          doc_count: { type: 'long' },
          passed: { type: 'long' },
          failed: { type: 'long' },
        },
      },
    },
  },
};
