/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SystemIndicesMigrationStatus } from '../../../../common/types';

export const systemIndicesMigrationStatus: SystemIndicesMigrationStatus = {
  migration_status: 'MIGRATION_NEEDED',
  features: [
    {
      feature_name: 'security',
      minimum_index_version: '7.1.1',
      migration_status: 'ERROR',
      indices: [
        {
          index: '.security-7',
          version: '7.1.1',
        },
      ],
    },
    {
      feature_name: 'machine_learning',
      minimum_index_version: '7.1.2',
      migration_status: 'IN_PROGRESS',
      indices: [
        {
          index: '.ml-config',
          version: '7.1.2',
        },
      ],
    },
    {
      feature_name: 'kibana',
      minimum_index_version: '7.1.3',
      migration_status: 'MIGRATION_NEEDED',
      indices: [
        {
          index: '.kibana',
          version: '7.1.3',
        },
      ],
    },
    {
      feature_name: 'logstash',
      minimum_index_version: '7.1.4',
      migration_status: 'NO_MIGRATION_NEEDED',
      indices: [
        {
          index: '.logstash-config',
          version: '7.1.4',
        },
      ],
    },
  ],
};
