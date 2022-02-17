/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TransformConfigSchema } from '../../../common/transforms/types';

/**
 * Mock for the TransformConfigSchema.
 * @returns A transform config schema mock
 */
export const getTransformConfigSchemaMock = (): TransformConfigSchema => ({
  enabled: true,
  auto_start: true,
  auto_create: true,
  query: {
    range: {
      '@timestamp': {
        gte: 'now-1d/d',
        format: 'strict_date_optional_time',
      },
    },
  },
  retention_policy: {
    time: {
      field: '@timestamp',
      max_age: '1w',
    },
  },
  max_page_search_size: 5000,
  settings: [
    {
      prefix: 'all',
      indices: ['auditbeat-*', 'endgame-*', 'filebeat-*', 'logs-*', 'packetbeat-*', 'winlogbeat-*'],
      data_sources: [
        ['auditbeat-*', 'endgame-*', 'filebeat-*', 'logs-*', 'packetbeat-*', 'winlogbeat-*'],
        ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
        ['auditbeat-*'],
      ],
    },
  ],
});
