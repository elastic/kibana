/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetCriticalityService } from './asset_criticality_service';

const buildMockAssetCriticalityService = (): jest.Mocked<AssetCriticalityService> => ({
  getCriticalitiesByIdentifiers: jest.fn().mockResolvedValue([]),
  isEnabled: jest.fn().mockReturnValue(true),
});

export const assetCriticalityServiceMock = {
  create: buildMockAssetCriticalityService,
};
