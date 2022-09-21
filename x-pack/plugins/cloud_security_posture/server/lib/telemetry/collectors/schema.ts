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
};
