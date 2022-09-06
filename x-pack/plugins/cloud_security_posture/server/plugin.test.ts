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
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { createPackagePolicyMock, deletePackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { CspPlugin } from './plugin';
import { CspServerPluginStartDeps } from './types';
import {
  createFleetAuthzMock,
  Installation,
  PackagePolicy,
  UpdatePackagePolicy,
} from '@kbn/fleet-plugin/common';
import {
  ExternalCallback,
  FleetStartContract,
  PostPackagePolicyDeleteCallback,
  PostPackagePolicyPostCreateCallback,
} from '@kbn/fleet-plugin/server';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../common/constants';
import Chance from 'chance';
import type { AwaitedProperties } from '@kbn/utility-types';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import {
  ElasticsearchClient,
  RequestHandlerContext,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';

const chance = new Chance();

const mockRouteContext = {
  core: coreMock.createRequestHandlerContext(),
} as unknown as AwaitedProperties<RequestHandlerContext>;

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
      taskManager: taskManagerMock.createStart(),
      security: securityMock.createStart(),
    };

    const contextMock = coreMock.createCustomRequestHandlerContext(mockRouteContext);
    const findMock = mockRouteContext.core.savedObjects.client.find as jest.Mock;
    findMock.mockReturnValue(
      Promise.resolve({
        saved_objects: [
          {
            type: 'csp_rule',
            attributes: {
              enabled: false,
              metadata: {
                rego_rule_id: 'cis_1_1_1',
                benchmark: { id: 'cis_k8s' },
              },
            },
          },
        ],
        total: 1,
        per_page: 10,
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
      packageMock.package!.name = CLOUD_SECURITY_POSTURE_PACKAGE_NAME;

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

    it('packagePolicyPostCreate should return the updated packagePolicy', async () => {
      fleetMock.packageService.asInternalUser.getInstallation.mockImplementationOnce(
        async (): Promise<Installation | undefined> => {
          return;
        }
      );

      fleetMock.packagePolicyService.update.mockImplementation(
        (
          soClient: SavedObjectsClientContract,
          esClient: ElasticsearchClient,
          id: string,
          packagePolicyUpdate: UpdatePackagePolicy
        ): Promise<PackagePolicy> => {
          // @ts-expect-error 2322
          return packagePolicyUpdate;
        }
      );

      const packageMock = createPackagePolicyMock();
      packageMock.package!.name = CLOUD_SECURITY_POSTURE_PACKAGE_NAME;
      packageMock.vars = { runtimeCfg: { type: 'foo' } };

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
        const updatedPackagePolicy = await cb(
          packageMock,
          contextMock,
          httpServerMock.createKibanaRequest()
        );
        if (fleetMock.packagePolicyService.update.mock.calls.length) {
          expect(updatedPackagePolicy).toHaveProperty('vars');
          expect(updatedPackagePolicy.vars).toHaveProperty('runtimeCfg');
          expect(updatedPackagePolicy.vars!.runtimeCfg).toHaveProperty('value');
        }
      }
      expect(fleetMock.packagePolicyService.update).toHaveBeenCalledTimes(1);
    });

    it('should uninstall resources when package is removed', async () => {
      fleetMock.packageService.asInternalUser.getInstallation.mockImplementationOnce(
        async (): Promise<Installation | undefined> => {
          return;
        }
      );

      const deletedPackagePolicyMock = deletePackagePolicyMock();
      deletedPackagePolicyMock[0].package!.name = CLOUD_SECURITY_POSTURE_PACKAGE_NAME;

      const packagePolicyPostDeleteCallbacks: PostPackagePolicyDeleteCallback[] = [];
      fleetMock.registerExternalCallback.mockImplementation((...args) => {
        if (args[0] === 'postPackagePolicyDelete') {
          packagePolicyPostDeleteCallbacks.push(args[1]);
        }
      });

      const coreStart = coreMock.createStart();
      const repositoryFindMock = coreStart.savedObjects.createInternalRepository()
        .find as jest.Mock;

      repositoryFindMock.mockReturnValueOnce(
        Promise.resolve({
          saved_objects: [
            {
              type: 'csp-rule-template',
              id: 'csp_rule_template-41308bcdaaf665761478bb6f0d745a5c',
              benchmark: {
                id: 'cis_k8s',
              },
            },
          ],
        })
      );

      repositoryFindMock.mockReturnValueOnce(
        Promise.resolve({
          saved_objects: [],
        })
      );

      const context = coreMock.createPluginInitializerContext<unknown>();
      plugin = new CspPlugin(context);
      const spy = jest.spyOn(plugin, 'uninstallResources').mockImplementation();

      // Act
      await plugin.start(coreStart, mockPlugins);
      await mockPlugins.fleet.fleetSetupCompleted();

      // Assert
      expect(fleetMock.packageService.asInternalUser.getInstallation).toHaveBeenCalledTimes(1);

      expect(packagePolicyPostDeleteCallbacks.length).toBeGreaterThan(0);

      for (const cb of packagePolicyPostDeleteCallbacks) {
        await cb(deletedPackagePolicyMock);
      }
      expect(repositoryFindMock).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
