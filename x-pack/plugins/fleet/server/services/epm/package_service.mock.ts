/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageClient, PackageService } from './package_service';

const createClientMock = (): jest.Mocked<PackageClient> => ({
  getInstallation: jest.fn(),
  ensureInstalledPackage: jest.fn(),
  fetchFindLatestPackage: jest.fn(),
  getRegistryPackage: jest.fn(),
  reinstallEsAssets: jest.fn(),
});

const createServiceMock = (): PackageService => ({
  asScoped: jest.fn(createClientMock),
  asInternalUser: createClientMock(),
});

export const packageServiceMock = {
  createClient: createClientMock,
  create: createServiceMock,
};
