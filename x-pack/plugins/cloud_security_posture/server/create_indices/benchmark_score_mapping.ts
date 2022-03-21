/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const benchmarkScoreMapping: MappingTypeMapping = {
  properties: {
    '@timestamp': {
      type: 'date',
    },
    score: {
      type: 'float',
    },
    total_findings: {
      type: 'integer',
    },
    'passed.passed_counter': {
      type: 'integer',
    },
    'failed.failed_counter': {
      type: 'integer',
    },
    cluster_id: {
      type: 'text',
      fields: {
        keyword: {
          ignore_above: 1024,
          type: 'keyword',
        },
      },
    },
    'rule.benchmark.name': {
      type: 'text',
      fields: {
        keyword: {
          ignore_above: 1024,
          type: 'keyword',
        },
      },
    },
  },
};
