/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { CloudDefendPlugin } from './plugin';
import { CloudDefendPluginStartDeps } from './types';
import { PackagePolicy, UpdatePackagePolicy } from '@kbn/fleet-plugin/common';
import { PostPackagePolicyPostCreateCallback } from '@kbn/fleet-plugin/server';
import { INTEGRATION_PACKAGE_NAME } from '../common/constants';
import Chance from 'chance';
import type { AwaitedProperties } from '@kbn/utility-types';
import {
  ElasticsearchClient,
  RequestHandlerContext,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import * as onPackagePolicyPostCreateCallback from './lib/fleet_util';
import { createFleetStartContractMock } from '@kbn/fleet-plugin/server/mocks';

const chance = new Chance();

const mockRouteContext = {
  core: coreMock.createRequestHandlerContext(),
} as unknown as AwaitedProperties<RequestHandlerContext>;

describe('Cloud Defend Plugin', () => {
  describe('start()', () => {
    const fleetMock = createFleetStartContractMock();
    const mockPlugins: CloudDefendPluginStartDeps = {
      fleet: fleetMock,
      data: dataPluginMock.createStartContract(),
      security: securityMock.createStart(),
      licensing: licensingMock.createStart(),
    };

    const contextMock = coreMock.createCustomRequestHandlerContext(mockRouteContext);

    let plugin: CloudDefendPlugin;

    beforeEach(() => jest.clearAllMocks());

    it('should initialize when new package is created', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const onPackagePolicyPostCreateCallbackSpy = jest
        .spyOn(onPackagePolicyPostCreateCallback, 'onPackagePolicyPostCreateCallback')
        .mockResolvedValue();

      const packageMock = createPackagePolicyMock();
      packageMock.package!.name = INTEGRATION_PACKAGE_NAME;

      const packagePolicyPostCreateCallbacks: PostPackagePolicyPostCreateCallback[] = [];
      fleetMock.registerExternalCallback.mockImplementation((...args) => {
        if (args[0] === 'packagePolicyPostCreate') {
          packagePolicyPostCreateCallbacks.push(args[1]);
        }
      });

      const context = coreMock.createPluginInitializerContext<unknown>();
      plugin = new CloudDefendPlugin(context);

      // Act
      plugin.start(coreMock.createStart(), mockPlugins);
      await mockPlugins.fleet.fleetSetupCompleted();

      // Assert
      expect(onPackagePolicyPostCreateCallbackSpy).not.toHaveBeenCalled();
      expect(packagePolicyPostCreateCallbacks.length).toBeGreaterThan(0);

      for (const cb of packagePolicyPostCreateCallbacks) {
        await cb(
          packageMock,
          soClient,
          esClient,
          contextMock,
          httpServerMock.createKibanaRequest()
        );
      }

      expect(onPackagePolicyPostCreateCallbackSpy).toHaveBeenCalled();
    });

    it('should not initialize when other package is created', async () => {
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      const packageMock = createPackagePolicyMock();
      packageMock.package!.name = chance.word();

      const packagePolicyPostCreateCallbacks: PostPackagePolicyPostCreateCallback[] = [];
      fleetMock.registerExternalCallback.mockImplementation((...args) => {
        if (args[0] === 'packagePolicyPostCreate') {
          packagePolicyPostCreateCallbacks.push(args[1]);
        }
      });

      const context = coreMock.createPluginInitializerContext<unknown>();
      plugin = new CloudDefendPlugin(context);

      // Act
      plugin.start(coreMock.createStart(), mockPlugins);
      await mockPlugins.fleet.fleetSetupCompleted();

      // Assert
      expect(packagePolicyPostCreateCallbacks.length).toBeGreaterThan(0);

      for (const cb of packagePolicyPostCreateCallbacks) {
        await cb(
          packageMock,
          soClient,
          esClient,
          contextMock,
          httpServerMock.createKibanaRequest()
        );
      }
    });

    it('packagePolicyPostCreate should return the same received policy', async () => {
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
      packageMock.package!.name = INTEGRATION_PACKAGE_NAME;
      packageMock.vars = { runtimeCfg: { type: 'foo' } };

      const packagePolicyPostCreateCallbacks: PostPackagePolicyPostCreateCallback[] = [];
      fleetMock.registerExternalCallback.mockImplementation((...args) => {
        if (args[0] === 'packagePolicyPostCreate') {
          packagePolicyPostCreateCallbacks.push(args[1]);
        }
      });

      const context = coreMock.createPluginInitializerContext<unknown>();
      plugin = new CloudDefendPlugin(context);

      // Act
      plugin.start(coreMock.createStart(), mockPlugins);
      await mockPlugins.fleet.fleetSetupCompleted();

      expect(packagePolicyPostCreateCallbacks.length).toBeGreaterThan(0);

      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      for (const cb of packagePolicyPostCreateCallbacks) {
        const updatedPackagePolicy = await cb(
          packageMock,
          soClient,
          esClient,
          contextMock,
          httpServerMock.createKibanaRequest()
        );
        expect(updatedPackagePolicy).toEqual(packageMock);
      }

      expect(fleetMock.packagePolicyService.update).toHaveBeenCalledTimes(0);
    });
  });
});
