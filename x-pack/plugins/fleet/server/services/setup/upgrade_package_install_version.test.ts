/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import { reinstallPackageForInstallation } from '../epm/packages';

import { upgradePackageInstallVersion } from './upgrade_package_install_version';

jest.mock('../epm/packages');

const mockedReinstallPackageForInstallation = jest.mocked(reinstallPackageForInstallation);

describe('upgradePackageInstallVersion', () => {
  beforeEach(() => {
    mockedReinstallPackageForInstallation.mockReset();
    mockedReinstallPackageForInstallation.mockResolvedValue({} as any);
  });
  it('should upgrade outdated package version', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    soClient.find.mockResolvedValue({
      total: 2,
      saved_objects: [
        {
          attributes: { name: 'test1' },
        },
        {
          attributes: { name: 'test2' },
        },
      ],
    } as any);

    await upgradePackageInstallVersion({
      esClient,
      soClient,
      logger,
    });

    expect(mockedReinstallPackageForInstallation).toBeCalledTimes(2);
    expect(mockedReinstallPackageForInstallation).toBeCalledWith(
      expect.objectContaining({
        installation: expect.objectContaining({ name: 'test1' }),
      })
    );
    expect(mockedReinstallPackageForInstallation).toBeCalledWith(
      expect.objectContaining({
        installation: expect.objectContaining({ name: 'test2' }),
      })
    );

    expect(logger.warn).not.toBeCalled();
    expect(logger.error).not.toBeCalled();
  });

  it('should log at error level when an error happens while reinstalling package', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    mockedReinstallPackageForInstallation.mockRejectedValue(new Error('test error'));
    soClient.find.mockResolvedValue({
      total: 2,
      saved_objects: [
        {
          attributes: { name: 'test1' },
        },
      ],
    } as any);

    await upgradePackageInstallVersion({
      esClient,
      soClient,
      logger,
    });

    expect(logger.error).toBeCalled();
  });

  it('should log a warn level when an error happens while reinstalling an uploaded package', async () => {
    const logger = loggingSystemMock.createLogger();
    const esClient = elasticsearchServiceMock.createInternalClient();
    const soClient = savedObjectsClientMock.create();

    mockedReinstallPackageForInstallation.mockRejectedValue(new Error('test error'));
    soClient.find.mockResolvedValue({
      total: 2,
      saved_objects: [
        {
          attributes: { name: 'test1', install_source: 'upload' },
        },
      ],
    } as any);

    await upgradePackageInstallVersion({
      esClient,
      soClient,
      logger,
    });

    expect(logger.warn).toBeCalled();
  });
});
