/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Client from '@elastic/elasticsearch/lib/client';

export const MOCK_ROLLUP_INDEX_NAME = 'mock-rollup-index';

export const createMockRollupIndex = async (es: Client) => {
  await es.indices.create({
    index: MOCK_ROLLUP_INDEX_NAME,
    mappings: {
      _meta: {
        _rollup: {
          logs_job: {
            id: 'mockRollupJob',
            index_pattern: MOCK_ROLLUP_INDEX_NAME,
            rollup_index: 'rollup_index',
            cron: '0 0 0 ? * 7',
            page_size: 1000,
            groups: {
              date_histogram: {
                interval: '24h',
                delay: '1d',
                time_zone: 'UTC',
                field: 'testCreatedField',
              },
              terms: {
                fields: ['testTotalField', 'testTagField'],
              },
              histogram: {
                interval: '7',
                fields: ['testTotalField'],
              },
            },
          },
        },
        'rollup-version': '',
      },
    },
  });
};
