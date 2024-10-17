/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { productDocInstallStatusSavedObjectTypeName } from '../common/consts';
import { ProductDocBasePlugin } from './plugin';

jest.mock('./services/package_installer');
jest.mock('./services/search');
jest.mock('./services/doc_install_status');
jest.mock('./routes');
import { registerRoutes } from './routes';
import { PackageInstaller } from './services/package_installer';

const PackageInstallMock = PackageInstaller as jest.Mock;

describe('ProductDocBasePlugin', () => {
  let initContext: ReturnType<typeof coreMock.createPluginInitializerContext>;
  let plugin: ProductDocBasePlugin;

  beforeEach(() => {
    initContext = coreMock.createPluginInitializerContext();
    plugin = new ProductDocBasePlugin(initContext);

    PackageInstallMock.mockReturnValue({ ensureUpToDate: jest.fn().mockResolvedValue({}) });
  });

  describe('#setup', () => {
    it('register the routes', () => {
      plugin.setup(coreMock.createSetup(), {});

      expect(registerRoutes).toHaveBeenCalledTimes(1);
    });
    it('register the product-doc SO type', () => {
      const coreSetup = coreMock.createSetup();
      plugin.setup(coreSetup, {});

      expect(coreSetup.savedObjects.registerType).toHaveBeenCalledTimes(1);
      expect(coreSetup.savedObjects.registerType).toHaveBeenCalledWith(
        expect.objectContaining({
          name: productDocInstallStatusSavedObjectTypeName,
        })
      );
    });
  });

  describe('#start', () => {
    it('returns a contract with the expected shape', () => {
      plugin.setup(coreMock.createSetup(), {});
      const startContract = plugin.start(coreMock.createStart(), {});
      expect(startContract).toEqual({
        isInstalled: expect.any(Function),
        search: expect.any(Function),
      });
    });
  });
});
