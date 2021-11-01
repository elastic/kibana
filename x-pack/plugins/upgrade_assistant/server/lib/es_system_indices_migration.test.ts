/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertFeaturesToIndicesArray } from './es_system_indices_migration';
import { SystemIndicesMigrationStatus } from '../../common/types';

const esUpgradeSystemIndicesStatusMock: SystemIndicesMigrationStatus = {
  features: [
    {
      feature_name: 'machine_learning',
      minimum_index_version: '7.1.1',
      migration_status: 'MIGRATION_NEEDED',
      indices: [
        {
          index: '.ml-config',
          version: '7.1.1',
        },
        {
          index: '.ml-notifications',
          version: '7.1.1',
        },
      ],
    },
    {
      feature_name: 'security',
      minimum_index_version: '7.1.1',
      migration_status: 'MIGRATION_NEEDED',
      indices: [
        {
          index: '.ml-config',
          version: '7.1.1',
        },
      ],
    },
  ],
  migration_status: 'MIGRATION_NEEDED',
};

describe('convertFeaturesToIndicesArray', () => {
  it('converts list with features to flat array of uniq indices', async () => {
    const result = convertFeaturesToIndicesArray(esUpgradeSystemIndicesStatusMock.features);
    expect(result).toEqual(['.ml-config', '.ml-notifications']);
  });

  it('returns empty array if no features are passed to it', async () => {
    expect(convertFeaturesToIndicesArray([])).toEqual([]);
  });
});
