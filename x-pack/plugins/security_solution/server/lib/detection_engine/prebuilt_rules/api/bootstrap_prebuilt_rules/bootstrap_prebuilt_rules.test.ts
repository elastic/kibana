/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bootstrapPrebuiltRulesRoute } from './bootstrap_prebuilt_rules';

import type { Installation, RegistryPackage } from '@kbn/fleet-plugin/common';
import { requestContextMock, serverMock } from '../../../routes/__mocks__';
import { getBootstrapRulesRequest } from '../../../routes/__mocks__/request_responses';

const packageMock: RegistryPackage = {
  name: 'detection_engine',
  version: '1.0.0',
  format_version: '1.0.0',
  title: 'Test package',
  description: 'Test package',
  owner: { github: 'elastic' },
  download: '',
  path: '',
};

const installationMock: Installation = {
  name: 'detection_engine',
  version: '1.0.0',
  installed_kibana: [],
  installed_es: [],
  es_index_patterns: {},
  install_status: 'installed',
  verification_status: 'verified',
  install_version: '1.0.0',
  install_source: 'registry',
  install_started_at: '2021-08-02T15:00:00.000Z',
};

describe('bootstrap_prebuilt_rules_route', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    bootstrapPrebuiltRulesRoute(server.router);
  });

  it('returns information about installed packages', async () => {
    clients.internalFleetServices.packages.fetchFindLatestPackage.mockResolvedValue(packageMock);
    clients.internalFleetServices.packages.ensureInstalledPackage.mockResolvedValue({
      status: 'installed',
      package: installationMock,
    });
    const response = await server.inject(
      getBootstrapRulesRequest(),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      packages: expect.arrayContaining([
        expect.objectContaining({
          name: 'detection_engine',
          version: '1.0.0',
          status: 'installed',
        }),
      ]),
    });
  });

  it('installs pre-release packages in dev mode', async () => {
    // Mock the package installation
    clients.internalFleetServices.packages.fetchFindLatestPackage.mockResolvedValue(packageMock);
    clients.internalFleetServices.packages.ensureInstalledPackage.mockResolvedValue({
      status: 'installed',
      package: installationMock,
    });

    // Mock Kibana build and branch
    clients.appClient.getBuildFlavor.mockReturnValue('traditional');
    clients.appClient.getKibanaBranch.mockReturnValue('main');

    const response = await server.inject(
      getBootstrapRulesRequest(),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(clients.internalFleetServices.packages.fetchFindLatestPackage).toHaveBeenCalledWith(
      'security_detection_engine',
      { prerelease: true }
    );
  });

  it('installs pre-release packages for release candidates', async () => {
    // Mock the package installation
    clients.internalFleetServices.packages.fetchFindLatestPackage.mockResolvedValue(packageMock);
    clients.internalFleetServices.packages.ensureInstalledPackage.mockResolvedValue({
      status: 'installed',
      package: installationMock,
    });

    // Mock Kibana build and branch
    clients.appClient.getBuildFlavor.mockReturnValue('traditional');
    clients.appClient.getKibanaBranch.mockReturnValue('8.16.0');
    clients.appClient.getKibanaVersion.mockReturnValue('8.16.0-SNAPSHOT');

    const response = await server.inject(
      getBootstrapRulesRequest(),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(clients.internalFleetServices.packages.fetchFindLatestPackage).toHaveBeenCalledWith(
      'security_detection_engine',
      { prerelease: true }
    );
  });

  it('installs release packages for Serverless', async () => {
    // Mock the package installation
    clients.internalFleetServices.packages.fetchFindLatestPackage.mockResolvedValue(packageMock);
    clients.internalFleetServices.packages.ensureInstalledPackage.mockResolvedValue({
      status: 'installed',
      package: installationMock,
    });

    // Mock Kibana build and branch
    clients.appClient.getBuildFlavor.mockReturnValue('serverless');
    clients.appClient.getKibanaBranch.mockReturnValue('main');

    const response = await server.inject(
      getBootstrapRulesRequest(),
      requestContextMock.convertContext(context)
    );
    expect(response.status).toEqual(200);
    expect(clients.internalFleetServices.packages.fetchFindLatestPackage).toHaveBeenCalledWith(
      'security_detection_engine',
      { prerelease: false }
    );
  });
});
