/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { CreateAgentPolicyResponse } from '@kbn/fleet-plugin/common';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from './api_helper';
import { cleanFleetIndices, expectToRejectWithError } from './helpers';
import { setupTestUsers, testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');
  let TEST_SPACE_1: string;

  describe('package policies', function () {
    skipIfNoDockerRegistry(providerContext);
    const apiClient = new SpaceTestApiClient(supertestWithoutAuth, {
      username: testUsers.fleet_all_int_all.username,
      password: testUsers.fleet_all_int_all.password,
    });

    let multiSpacePolicy: CreateAgentPolicyResponse;
    let defaultSpacePolicy: CreateAgentPolicyResponse;

    before(async () => {
      await setupTestUsers(getService('security'), true);
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);

      await apiClient.postEnableSpaceAwareness();

      await spaces.createTestSpace(TEST_SPACE_1);
      multiSpacePolicy = await apiClient.createAgentPolicy(undefined, {
        space_ids: ['default', TEST_SPACE_1],
      });
      defaultSpacePolicy = await apiClient.createAgentPolicy(undefined, {
        space_ids: ['default'],
      });
      await apiClient.installPackage({ pkgName: 'nginx', force: true, pkgVersion: '1.20.0' });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);
    });

    describe('POST /package_policies', () => {
      let packagePolicyId: string;
      after(async () => {
        if (packagePolicyId) {
          await apiClient.deletePackagePolicy(packagePolicyId);
        }
      });
      it('should allow to add a package policy to a multi-space agent policy in the default space', async () => {
        const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          policy_ids: [multiSpacePolicy.item.id],
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: '1.20.0',
          },
          inputs: {},
        });

        expect(packagePolicyRes.item).to.have.property('id');
        packagePolicyId = packagePolicyRes.item.id;
      });

      it('should not allow to add a reusable package policy to a multi-space agent policy in the default space', async () => {
        await expectToRejectWithError(
          () =>
            apiClient.createPackagePolicy(undefined, {
              policy_ids: [multiSpacePolicy.item.id, defaultSpacePolicy.item.id],
              name: `test-nginx-${Date.now()}`,
              description: 'test',
              package: {
                name: 'nginx',
                version: '1.20.0',
              },
              inputs: {},
            }),
          /400 "Bad Request" Reusable integration policies cannot be used with agent policies belonging to multiple spaces./
        );
      });
    });

    describe('PUT /package_policies', () => {
      let packagePolicyId: string;
      before(async () => {
        const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          policy_ids: [multiSpacePolicy.item.id],
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: '1.20.0',
          },
          inputs: {},
        });
        packagePolicyId = packagePolicyRes.item.id;
      });
      after(async () => {
        if (packagePolicyId) {
          await apiClient.deletePackagePolicy(packagePolicyId);
        }
      });
      it('should allow to edit a package policy in a multi-space agent policy in the default space', async () => {
        const packagePolicyRes = await apiClient.updatePackagePolicy(packagePolicyId, {
          policy_ids: [multiSpacePolicy.item.id],
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: '1.20.0',
          },
          inputs: {},
        });

        expect(packagePolicyRes.item).to.have.property('id');
        packagePolicyId = packagePolicyRes.item.id;
      });

      it('should not allow to make a policy used in multiple space reusable', async () => {
        await expectToRejectWithError(
          () =>
            apiClient.updatePackagePolicy(packagePolicyId, {
              policy_ids: [multiSpacePolicy.item.id, defaultSpacePolicy.item.id],
              name: `test-nginx-${Date.now()}`,
              description: 'test',
              package: {
                name: 'nginx',
                version: '1.20.0',
              },
              inputs: {},
            }),
          /400 "Bad Request" Reusable integration policies cannot be used with agent policies belonging to multiple spaces./
        );
      });
    });
  });
}
