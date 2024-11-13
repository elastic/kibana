/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { productDocInstallStatusSavedObjectTypeName } from '../common/consts';
import { ProductDocBasePlugin } from './plugin';
import { ProductDocBaseSetupDependencies, ProductDocBaseStartDependencies } from './types';

jest.mock('./services/package_installer');
jest.mock('./services/search');
jest.mock('./services/doc_install_status');
jest.mock('./routes');
jest.mock('./tasks');
import { registerRoutes } from './routes';
import { PackageInstaller } from './services/package_installer';
import { registerTaskDefinitions, scheduleEnsureUpToDateTask } from './tasks';

const PackageInstallMock = PackageInstaller as jest.Mock;

describe('ProductDocBasePlugin', () => {
  let initContext: ReturnType<typeof coreMock.createPluginInitializerContext>;
  let plugin: ProductDocBasePlugin;
  let pluginSetupDeps: ProductDocBaseSetupDependencies;
  let pluginStartDeps: ProductDocBaseStartDependencies;

  beforeEach(() => {
    initContext = coreMock.createPluginInitializerContext();
    plugin = new ProductDocBasePlugin(initContext);
    pluginSetupDeps = {
      taskManager: taskManagerMock.createSetup(),
    };
    pluginStartDeps = {
      licensing: licensingMock.createStart(),
      taskManager: taskManagerMock.createStart(),
    };

    PackageInstallMock.mockReturnValue({ ensureUpToDate: jest.fn().mockResolvedValue({}) });
  });

  afterEach(() => {
    (scheduleEnsureUpToDateTask as jest.Mock).mockReset();
  });

  describe('#setup', () => {
    it('register the routes', () => {
      plugin.setup(coreMock.createSetup(), pluginSetupDeps);

      expect(registerRoutes).toHaveBeenCalledTimes(1);
    });
    it('register the product-doc SO type', () => {
      const coreSetup = coreMock.createSetup();
      plugin.setup(coreSetup, pluginSetupDeps);

      expect(coreSetup.savedObjects.registerType).toHaveBeenCalledTimes(1);
      expect(coreSetup.savedObjects.registerType).toHaveBeenCalledWith(
        expect.objectContaining({
          name: productDocInstallStatusSavedObjectTypeName,
        })
      );
    });
    it('register the task definitions', () => {
      plugin.setup(coreMock.createSetup(), pluginSetupDeps);

      expect(registerTaskDefinitions).toHaveBeenCalledTimes(3);
    });
  });

  describe('#start', () => {
    it('returns a contract with the expected shape', () => {
      plugin.setup(coreMock.createSetup(), pluginSetupDeps);
      const startContract = plugin.start(coreMock.createStart(), pluginStartDeps);
      expect(startContract).toEqual({
        management: {
          getStatus: expect.any(Function),
          install: expect.any(Function),
          uninstall: expect.any(Function),
          update: expect.any(Function),
        },
        search: expect.any(Function),
      });
    });

    it('schedules the update task', () => {
      plugin.setup(coreMock.createSetup(), pluginSetupDeps);
      plugin.start(coreMock.createStart(), pluginStartDeps);

      expect(scheduleEnsureUpToDateTask).toHaveBeenCalledTimes(1);
    });
  });
});
