/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateAssetCriticalityMappings } from './update_asset_criticality_mappings';
import type { Logger } from '@kbn/core/server';

const mockIsEcsMappingsMigrationRequired = jest.fn();
const mockMigrateEcsMappings = jest.fn();

jest.mock('../asset_criticality_migration_client', () => ({
  AssetCriticalityEcsMigrationClient: jest.fn().mockImplementation(() => ({
    isEcsMappingsMigrationRequired: () => mockIsEcsMappingsMigrationRequired(),
    migrateEcsMappings: () => mockMigrateEcsMappings(),
  })),
}));

describe('updateAssetCriticalityMappings', () => {
  const mockLogger = { info: jest.fn(), error: jest.fn() } as unknown as Logger;
  const mockGetStartServices = jest
    .fn()
    .mockResolvedValue([{ elasticsearch: { client: { asInternalUser: {} } } }]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should migrate mappings if migration is required', async () => {
    mockIsEcsMappingsMigrationRequired.mockResolvedValue(true);

    await updateAssetCriticalityMappings({
      auditLogger: undefined,
      logger: mockLogger,
      getStartServices: mockGetStartServices,
      kibanaVersion: '8.0.0',
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Migrating Asset Criticality mappings');
    expect(mockMigrateEcsMappings).toHaveBeenCalled();
  });

  it('should not migrate mappings if migration is not required', async () => {
    mockIsEcsMappingsMigrationRequired.mockResolvedValue(false);

    await updateAssetCriticalityMappings({
      auditLogger: undefined,
      logger: mockLogger,
      getStartServices: mockGetStartServices,
      kibanaVersion: '8.0.0',
    });

    expect(mockIsEcsMappingsMigrationRequired).toHaveBeenCalled();
    expect(mockLogger.info).not.toHaveBeenCalledWith('Migrating Asset Criticality mappings');
  });
});
