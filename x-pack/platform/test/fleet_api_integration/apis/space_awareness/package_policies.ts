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
import { cleanFleetIndices, createTestSpace, expectToRejectWithError } from './helpers';
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
    let allSpacePolicy: CreateAgentPolicyResponse;

    before(async () => {
      await setupTestUsers(getService('security'), true);
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({
        space: TEST_SPACE_1,
      });
      await cleanFleetIndices(esClient);

      await apiClient.postEnableSpaceAwareness();
      await apiClient.setup();

      await createTestSpace(providerContext, TEST_SPACE_1);
      multiSpacePolicy = await apiClient.createAgentPolicy('default', {
        space_ids: ['default', TEST_SPACE_1],
      });
      defaultSpacePolicy = await apiClient.createAgentPolicy('default', {
        space_ids: ['default'],
      });
      allSpacePolicy = await apiClient.createAgentPolicy(undefined, {
        space_ids: ['*'],
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

      it('should allow to add a package policy to an all agent policy in the default space', async () => {
        const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          policy_ids: [allSpacePolicy.item.id],
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

        const updatedPolicy = await apiClient.getPackagePolicy(packagePolicyId);
        expect(updatedPolicy.item.spaceIds).to.eql('*');
      });

      it('should allow to add a package policy to an all agent policy in the test space', async () => {
        const packagePolicyRes = await apiClient.createPackagePolicy(undefined, {
          policy_ids: [allSpacePolicy.item.id],
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

      it('should not allow to add a reusable package policy to an all space agent policy in the default space', async () => {
        await expectToRejectWithError(
          () =>
            apiClient.createPackagePolicy(undefined, {
              policy_ids: [allSpacePolicy.item.id, defaultSpacePolicy.item.id],
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

      it('should not allow to add a package policy to a multispace policy that has name conflict with another policy in a different space', async () => {
        const packagePolicyResInDefaultSpace = await apiClient.createPackagePolicy(undefined, {
          policy_ids: [defaultSpacePolicy.item.id],
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: '1.20.0',
          },
          inputs: {},
        });

        await expectToRejectWithError(
          () =>
            apiClient.createPackagePolicy(TEST_SPACE_1, {
              policy_ids: [multiSpacePolicy.item.id],
              name: packagePolicyResInDefaultSpace.item.name,
              description: 'test',
              package: {
                name: 'nginx',
                version: '1.20.0',
              },
              inputs: {},
            }),
          /409 "Conflict" An integration policy with the name test-nginx-.* already exists. Please rename it or choose a different name./
        );
      });
    });

    describe('PUT /package_policies', () => {
      let packagePolicyId: string;
      let allSpacePolicyId: string;
      before(async () => {
        const [packagePolicyRes, allSpacePackagePolicyRes] = await Promise.all([
          apiClient.createPackagePolicy(undefined, {
            policy_ids: [multiSpacePolicy.item.id],
            name: `test-nginx-multispace-${Date.now()}`,
            description: 'test',
            package: {
              name: 'nginx',
              version: '1.20.0',
            },
            inputs: {},
          }),
          apiClient.createPackagePolicy(undefined, {
            policy_ids: [allSpacePolicy.item.id],
            name: `test-nginx-allspace-${Date.now()}`,
            description: 'test',
            package: {
              name: 'nginx',
              version: '1.20.0',
            },
            inputs: {},
          }),
        ]);

        packagePolicyId = packagePolicyRes.item.id;
        allSpacePolicyId = allSpacePackagePolicyRes.item.id;
      });
      after(async () => {
        if (packagePolicyId) {
          await apiClient.deletePackagePolicy(packagePolicyId);
        }
        if (allSpacePolicyId) {
          await apiClient.deletePackagePolicy(allSpacePolicyId);
        }
      });
      it('should allow to edit a package policy in a multi-space agent policy in the default space', async () => {
        await apiClient.updatePackagePolicy(packagePolicyId, {
          policy_ids: [multiSpacePolicy.item.id],
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: '1.20.0',
          },
          inputs: {},
        });
      });

      it('should allow to edit a package policy in an all spaces agent policy in the default space', async () => {
        await apiClient.updatePackagePolicy(allSpacePolicyId, {
          policy_ids: [allSpacePolicy.item.id],
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: '1.20.0',
          },
          inputs: {},
        });
      });

      it('should allow to edit a package policy in an all spaces agent policy in the test space', async () => {
        await apiClient.updatePackagePolicy(
          allSpacePolicyId,
          {
            policy_ids: [allSpacePolicy.item.id],
            name: `test-nginx-${Date.now()}`,
            description: 'test',
            package: {
              name: 'nginx',
              version: '1.20.0',
            },
            inputs: {},
          },
          TEST_SPACE_1
        );
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

      it('should not allow to make a policy used in all space reusable', async () => {
        await expectToRejectWithError(
          () =>
            apiClient.updatePackagePolicy(packagePolicyId, {
              policy_ids: [allSpacePolicy.item.id, defaultSpacePolicy.item.id],
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

      it('should prevent updating package policy name already in multiple spaces when name conflicts exist', async () => {
        const packagePolicyResInMultispace = await apiClient.createPackagePolicy(undefined, {
          policy_ids: [multiSpacePolicy.item.id],
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: '1.20.0',
          },
          inputs: {},
        });

        const packagePolicyResInDefaultSpace = await apiClient.createPackagePolicy(undefined, {
          policy_ids: [defaultSpacePolicy.item.id],
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: '1.20.0',
          },
          inputs: {},
        });

        await expectToRejectWithError(
          () =>
            apiClient.updatePackagePolicy(
              packagePolicyResInMultispace.item.id,
              {
                name: packagePolicyResInDefaultSpace.item.name,
              },
              TEST_SPACE_1
            ),
          /409 "Conflict" An integration policy with the name test-nginx-.* already exists. Please rename it or choose a different name./
        );
      });
    });
  });
}
