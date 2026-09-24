/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, isDockerRegistryEnabledOrSkipped } from '../../helpers';

const PACKAGE_NAME = 'nginx';
const PACKAGE_VERSION = '1.20.0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');

  const createSpace = async (spaceId: string) => {
    await supertest
      .post(`/api/spaces/space`)
      .set('kbn-xsrf', 'xxxx')
      .send({
        name: spaceId,
        id: spaceId,
        initials: 'T',
        color: '#D6BF57',
        disabledFeatures: [],
        imageUrl: '',
      })
      .expect(200);
  };

  const deleteSpace = async (spaceId: string) => {
    await supertest.delete(`/api/spaces/space/${spaceId}`).set('kbn-xsrf', 'xxxx').send();
  };

  const installPackage = async (spaceId?: string) => {
    const prefix = spaceId ? `/s/${spaceId}` : '';
    await supertest
      .post(`${prefix}/api/fleet/epm/packages/${PACKAGE_NAME}/${PACKAGE_VERSION}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  };

  const uninstallPackage = async () => {
    await supertest
      .delete(`/api/fleet/epm/packages/${PACKAGE_NAME}/${PACKAGE_VERSION}`)
      .set('kbn-xsrf', 'xxxx');
  };

  const createAgentPolicy = async (): Promise<string> => {
    const res = await supertest
      .post(`/api/fleet/agent_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send({ name: `Test agent policy ${Date.now()}`, namespace: 'default' })
      .expect(200);
    return res.body.item.id;
  };

  const deleteAgentPolicy = async (agentPolicyId: string) => {
    await supertest
      .post(`/api/fleet/agent_policies/delete`)
      .set('kbn-xsrf', 'xxxx')
      .send({ agentPolicyId });
  };

  const createPackagePolicy = async (agentPolicyId: string): Promise<string> => {
    const res = await supertest
      .post(`/api/fleet/package_policies`)
      .set('kbn-xsrf', 'xxxx')
      .send({
        policy_id: agentPolicyId,
        package: { name: PACKAGE_NAME, version: PACKAGE_VERSION },
        name: `test-policy-${Date.now()}`,
        description: '',
        namespace: 'default',
        inputs: {},
      })
      .expect(200);
    return res.body.item.id;
  };

  const deleteDatastreamAssets = async (
    packagePolicyId: string,
    spaceId?: string,
    expectedStatus = 200
  ) => {
    const prefix = spaceId ? `/s/${spaceId}` : '';
    return supertest
      .delete(
        `${prefix}/api/fleet/epm/packages/${PACKAGE_NAME}/${PACKAGE_VERSION}/datastream_assets`
      )
      .set('kbn-xsrf', 'xxxx')
      .query({ packagePolicyId })
      .expect(expectedStatus);
  };

  describe('DELETE /epm/packages/{pkgName}/{pkgVersion}/datastream_assets', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    describe('space isolation', () => {
      const spaceA = 'fleet-test-space-a';

      before(async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;
        await createSpace(spaceA);
        await installPackage();
      });

      after(async () => {
        await uninstallPackage();
        await deleteSpace(spaceA);
      });

      it('should return 404 when the package policy belongs to a different space', async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;

        // Create policy in the default space; spaceA cannot see it.
        const agentPolicyId = await createAgentPolicy();
        const packagePolicyId = await createPackagePolicy(agentPolicyId);

        try {
          const res = await deleteDatastreamAssets(packagePolicyId, spaceA, 404);
          expect(res.body).to.have.property('message');
          expect(res.body.message).to.contain(packagePolicyId);
        } finally {
          await deleteAgentPolicy(agentPolicyId);
        }
      });

      it('should return 200 when the package policy belongs to the request space', async () => {
        if (!isDockerRegistryEnabledOrSkipped(providerContext)) return;

        // Create policy in the default space; delete from the default space succeeds.
        const agentPolicyId = await createAgentPolicy();
        const packagePolicyId = await createPackagePolicy(agentPolicyId);

        try {
          const res = await deleteDatastreamAssets(packagePolicyId, undefined, 200);
          expect(res.body).to.eql({ success: true });
        } finally {
          await deleteAgentPolicy(agentPolicyId);
        }
      });
    });
  });
}
