/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';

import type { Installation } from '../../../../common';

import { reinstallPackageForInstallation } from './reinstall';
import { installPackage } from './install';

jest.mock('./install');

const mockedInstallPackage = installPackage as jest.MockedFunction<typeof installPackage>;

describe('reinstallPackageForInstallation', () => {
  beforeEach(() => {
    mockedInstallPackage.mockReset();
  });
  it('should throw an error for uploaded package', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createInternalClient();
    await expect(
      reinstallPackageForInstallation({
        soClient,
        esClient,
        installation: {
          install_source: 'upload',
        } as Installation,
      })
    ).rejects.toThrow(/Cannot reinstall an uploaded package/);
  });

  it('should install registry package', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createInternalClient();
    await expect(
      reinstallPackageForInstallation({
        soClient,
        esClient,
        installation: {
          install_source: 'registry',
          name: 'test',
          version: '1.0.0',
        } as Installation,
      })
    );

    expect(mockedInstallPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        installSource: 'registry',
        pkgkey: 'test-1.0.0',
        force: true,
      })
    );
  });

  it('should install bundled package', async () => {
    const soClient = savedObjectsClientMock.create();
    const esClient = elasticsearchServiceMock.createInternalClient();
    await expect(
      reinstallPackageForInstallation({
        soClient,
        esClient,
        installation: {
          install_source: 'bundled',
          name: 'test',
          version: '1.0.0',
        } as Installation,
      })
    );

    expect(mockedInstallPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        installSource: 'registry',
        pkgkey: 'test-1.0.0',
        force: true,
      })
    );
  });
});
