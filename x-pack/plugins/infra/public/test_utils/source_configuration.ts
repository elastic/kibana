/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetLogSourceConfigurationSuccessResponsePayload } from '../../common/http_api/log_sources';

export const DEFAULT_SOURCE_CONFIGURATION: GetLogSourceConfigurationSuccessResponsePayload = {
  data: {
    id: 'default',
    version: 'WzQwNiwxXQ==',
    updatedAt: 1608559663482,
    origin: 'stored',
    configuration: {
      name: 'Default',
      description: '',
      logIndices: {
        type: 'index_pattern',
        indexPatternId: 'some-test-id',
      },
      fields: {
        container: 'container.id',
        host: 'host.name',
        pod: 'kubernetes.pod.uid',
        tiebreaker: '_doc',
        timestamp: '@timestamp',
        message: ['message'],
      },
      logColumns: [
        {
          timestampColumn: {
            id: '5e7f964a-be8a-40d8-88d2-fbcfbdca0e2f',
          },
        },
        {
          fieldColumn: {
            id: ' eb9777a8-fcd3-420e-ba7d-172fff6da7a2',
            field: 'event.dataset',
          },
        },
        {
          messageColumn: {
            id: 'b645d6da-824b-4723-9a2a-e8cece1645c0',
          },
        },
      ],
    },
  },
};
