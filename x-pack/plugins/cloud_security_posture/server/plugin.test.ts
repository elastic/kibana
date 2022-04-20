/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import {
  createPackagePolicyServiceMock,
  createArtifactsClientMock,
  createMockPackageService,
  createMockAgentService,
  createMockAgentPolicyService,
} from '@kbn/fleet-plugin/server/mocks';

import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { CspPlugin } from './plugin';
import { CspServerPluginStartDeps } from './types';
import { createFleetAuthzMock, Installation } from '@kbn/fleet-plugin/common';
import {
  ExternalCallback,
  FleetStartContract,
  PostPackagePolicyPostCreateCallback,
} from '@kbn/fleet-plugin/server';
import { CIS_KUBERNETES_PACKAGE_NAME } from '../common/constants';
import Chance from 'chance';
import type { DeeplyMockedKeys } from '@kbn/utility-types/jest';

const chance = new Chance();

const createMockFleetStartContract = (): DeeplyMockedKeys<FleetStartContract> => {
  return {
    authz: {
      fromRequest: jest.fn(async (_) => createFleetAuthzMock()),
    },
    fleetSetupCompleted: jest.fn().mockResolvedValue(undefined),
    esIndexPatternService: {
      getESIndexPattern: jest.fn().mockResolvedValue(undefined),
    },
    // @ts-expect-error 2322
    agentService: createMockAgentService(),
    // @ts-expect-error 2322
    packageService: createMockPackageService(),
    agentPolicyService: createMockAgentPolicyService(),
    registerExternalCallback: jest.fn((..._: ExternalCallback) => {}),
    packagePolicyService: createPackagePolicyServiceMock(),
    createArtifactsClient: jest.fn().mockReturnValue(createArtifactsClientMock()),
  };
};

describe('Cloud Security Posture Plugin', () => {
  describe('start()', () => {
    const fleetMock = createMockFleetStartContract();
    const mockPlugins: CspServerPluginStartDeps = {
      fleet: fleetMock,
      data: dataPluginMock.createStartContract(),
    };

    const contextMock = { core: coreMock.createRequestHandlerContext() };
    contextMock.core.savedObjects.client.find.mockReturnValue(
      Promise.resolve({
        saved_objects: [],
        total: 0,
        per_page: 0,
        page: 1,
      })
    );

    let plugin: CspPlugin;

    beforeEach(() => jest.clearAllMocks());

    it('should initialize when package installed', async () => {
      fleetMock.packageService.asInternalUser.getInstallation.mockImplementationOnce(
        async (): Promise<Installation | undefined> => {
          return {} as jest.Mocked<Installation>;
        }
      );

      const context = coreMock.createPluginInitializerContext<unknown>();
      plugin = new CspPlugin(context);
      const spy = jest.spyOn(plugin, 'initialize').mockImplementation();

      // Act
      await plugin.start(coreMock.createStart(), mockPlugins);
      await mockPlugins.fleet.fleetSetupCompleted();

      // Assert
      expect(fleetMock.packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not initialize when package is not installed', async () => {
      fleetMock.packageService.asInternalUser.getInstallation.mockImplementationOnce(
        async (): Promise<Installation | undefined> => {
          return;
        }
      );

      const context = coreMock.createPluginInitializerContext<unknown>();
      plugin = new CspPlugin(context);
      const spy = jest.spyOn(plugin, 'initialize').mockImplementation();

      // Act
      await plugin.start(coreMock.createStart(), mockPlugins);
      await mockPlugins.fleet.fleetSetupCompleted();

      // Assert
      expect(fleetMock.packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it('should initialize when new package is created', async () => {
      fleetMock.packageService.asInternalUser.getInstallation.mockImplementationOnce(
        async (): Promise<Installation | undefined> => {
          return;
        }
      );

      const packageMock = createPackagePolicyMock();
      packageMock.package!.name = CIS_KUBERNETES_PACKAGE_NAME;

      const packagePolicyPostCreateCallbacks: PostPackagePolicyPostCreateCallback[] = [];
      fleetMock.registerExternalCallback.mockImplementation((...args) => {
        if (args[0] === 'packagePolicyPostCreate') {
          packagePolicyPostCreateCallbacks.push(args[1]);
        }
      });

      const context = coreMock.createPluginInitializerContext<unknown>();
      plugin = new CspPlugin(context);
      const spy = jest.spyOn(plugin, 'initialize').mockImplementation();

      // Act
      await plugin.start(coreMock.createStart(), mockPlugins);
      await mockPlugins.fleet.fleetSetupCompleted();

      // Assert
      expect(fleetMock.packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledTimes(0);

      expect(packagePolicyPostCreateCallbacks.length).toBeGreaterThan(0);

      for (const cb of packagePolicyPostCreateCallbacks) {
        await cb(packageMock, contextMock, httpServerMock.createKibanaRequest());
      }

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not initialize when other package is created', async () => {
      fleetMock.packageService.asInternalUser.getInstallation.mockImplementationOnce(
        async (): Promise<Installation | undefined> => {
          return;
        }
      );

      const packageMock = createPackagePolicyMock();
      packageMock.package!.name = chance.word();

      const packagePolicyPostCreateCallbacks: PostPackagePolicyPostCreateCallback[] = [];
      fleetMock.registerExternalCallback.mockImplementation((...args) => {
        if (args[0] === 'packagePolicyPostCreate') {
          packagePolicyPostCreateCallbacks.push(args[1]);
        }
      });

      const context = coreMock.createPluginInitializerContext<unknown>();
      plugin = new CspPlugin(context);
      const spy = jest.spyOn(plugin, 'initialize').mockImplementation();

      // Act
      await plugin.start(coreMock.createStart(), mockPlugins);
      await mockPlugins.fleet.fleetSetupCompleted();

      // Assert
      expect(fleetMock.packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledTimes(0);

      expect(packagePolicyPostCreateCallbacks.length).toBeGreaterThan(0);

      for (const cb of packagePolicyPostCreateCallbacks) {
        await cb(packageMock, contextMock, httpServerMock.createKibanaRequest());
      }

      expect(spy).toHaveBeenCalledTimes(0);
    });
  });
});
