/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');

  const epmInstall = async (pkgName: string, pkgVersion: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${pkgName}/${pkgVersion}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  };

  const createAgentPolicy = async () => {
    const name = `agent-policy-${Math.random().toString(36).substring(2, 10)}`;
    const { body } = await supertest
      .post(`/api/fleet/agent_policies`)
      .set('kbn-xsrf', 'xxx')
      .send({ name, namespace: 'default' })
      .expect(200);
    return body.item.id;
  };

  const createPackagePolicy = async (
    policyId: string,
    pkg: any,
    statusCode = 200,
    force = false
  ) => {
    const name = `package-policy-${Math.random().toString(36).substring(2, 10)}`;
    const res = await supertest
      .post(`/api/fleet/package_policies`)
      .set('kbn-xsrf', 'xxx')
      .send({
        name,
        description: '',
        namespace: 'default',
        policy_id: policyId,
        enabled: true,
        inputs: [
          {
            enabled: true,
            streams: [],
            type: 'single_input',
          },
        ],
        package: pkg,
        force,
      })
      .expect(statusCode);
    return res.body;
  };

  const createAgent = async (agentPolicyId: string, version: string) => {
    const id = `agent-${Math.random().toString(36).substring(2, 10)}`;
    await fleetAndAgents.generateAgent('online', id, agentPolicyId, version);
    return id;
  };

  describe('Package Policy - version compatibility', () => {
    skipIfNoDockerRegistry(providerContext);

    // Shared policies for GET and POST tests
    let agentPolicyWithVersionId: string;
    let agentPolicyWithoutVersionId: string;
    let packagePolicyWithVersionId: string;
    let packagePolicyWithoutVersionId: string;

    before(async () => {
      // Not strictly necessary, but allows automatic cleanup.
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/agents');

      await epmInstall('agent_version_test', '1.0.0'); // version constraint of ^8.12.0
      await epmInstall('agent_version_test', '1.1.0'); // version constraint of ^8.13.0
      await epmInstall('single_input_no_streams', '0.1.0'); // no version constraint

      agentPolicyWithVersionId = await createAgentPolicy();
      const packagePolicyWithVersion = await createPackagePolicy(agentPolicyWithVersionId, {
        name: 'agent_version_test',
        version: '1.0.0',
      });
      packagePolicyWithVersionId = packagePolicyWithVersion.item.id;
      await createAgent(agentPolicyWithVersionId, '8.13.0'); // compatible with agent_version_test 1.0.0 and 1.1.0

      agentPolicyWithoutVersionId = await createAgentPolicy();
      const packagePolicyWithoutVersion = await createPackagePolicy(agentPolicyWithoutVersionId, {
        name: 'single_input_no_streams',
        version: '0.1.0',
      });
      packagePolicyWithoutVersionId = packagePolicyWithoutVersion.item.id;
      await createAgent(agentPolicyWithoutVersionId, '8.11.0'); // incompatible with agent_version_test 1.0.0
    });

    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/agents');
    });

    describe('GET /api/fleet/package_policies/{packagePolicyId}', () => {
      it('should return min_agent_version field when package has version constraint', async () => {
        const { body } = await supertest
          .get(`/api/fleet/package_policies/${packagePolicyWithVersionId}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(body.item.min_agent_version).to.eql('8.12.0');
      });

      it('should return no min_agent_version field when package has no version constraint', async () => {
        const { body } = await supertest
          .get(`/api/fleet/package_policies/${packagePolicyWithoutVersionId}`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(body.item.min_agent_version).to.be(undefined);
      });
    });

    describe('GET /api/fleet/package_policies', () => {
      it('should return min_agent_version field for each package policy with version constraint', async () => {
        const { body } = await supertest
          .get(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const policyWithVersion = body.items.find(
          (item: any) => item.id === packagePolicyWithVersionId
        );
        const policyWithoutVersion = body.items.find(
          (item: any) => item.id === packagePolicyWithoutVersionId
        );

        expect(policyWithVersion.min_agent_version).to.eql('8.12.0');
        expect(policyWithoutVersion.min_agent_version).to.be(undefined);
      });
    });

    describe('POST /api/fleet/package_policies/_bulk_get', () => {
      it('should return min_agent_version field for each package policy with version constraint', async () => {
        const { body } = await supertest
          .post(`/api/fleet/package_policies/_bulk_get`)
          .set('kbn-xsrf', 'xxx')
          .send({
            ids: [packagePolicyWithVersionId, packagePolicyWithoutVersionId],
          })
          .expect(200);

        const policyWithVersion = body.items.find(
          (item: any) => item.id === packagePolicyWithVersionId
        );
        const policyWithoutVersion = body.items.find(
          (item: any) => item.id === packagePolicyWithoutVersionId
        );

        expect(policyWithVersion.min_agent_version).to.eql('8.12.0');
        expect(policyWithoutVersion.min_agent_version).to.be(undefined);
      });
    });

    describe('POST /api/fleet/package_policies', () => {
      it('should allow creating a package policy when all agents on the agent policy are on a compatible version', async () => {
        await createPackagePolicy(agentPolicyWithVersionId, {
          name: 'agent_version_test',
          version: '1.0.0',
        });
      });

      it('should reject creating a package policy if the agent policy has at least one agent on an incompatible version', async () => {
        const body = await createPackagePolicy(
          agentPolicyWithoutVersionId,
          {
            name: 'agent_version_test',
            version: '1.0.0',
          },
          400
        );
        expect(body.message).to.contain('does not satisfy required version range');
        expect(body.message).to.contain('Use force:true to override');
      });

      it('should allow creating package policy with force=true if the agent policy has at least one agent on an incompatible version', async () => {
        await createPackagePolicy(
          agentPolicyWithoutVersionId,
          {
            name: 'agent_version_test',
            version: '1.0.0',
          },
          200,
          true
        );
      });
    });

    describe('PUT /api/fleet/package_policies/{packagePolicyId}', () => {
      describe('when the agent policy has agents on a compatible version with package update', () => {
        let packagePolicyId: string;

        before(async () => {
          const agentPolicyId = await createAgentPolicy();
          const packagePolicyWithVersion = await createPackagePolicy(agentPolicyId, {
            name: 'agent_version_test',
            version: '1.0.0',
          });
          packagePolicyId = packagePolicyWithVersion.item.id;
          await createAgent(agentPolicyId, '8.13.0'); // compatible with agent_version_test 1.0.0 and 1.1.0
        });

        it('should allow updating the package version', async () => {
          const { body } = await supertest
            .put(`/api/fleet/package_policies/${packagePolicyId}`)
            .set('kbn-xsrf', 'xxx')
            .send({
              package: {
                name: 'agent_version_test',
                version: '1.1.0',
              },
            })
            .expect(200);

          expect(body.item.package.version).to.eql('1.1.0');
        });
      });

      describe('when the agent policy has at least one agent on an incompatible version with package update', () => {
        let packagePolicyId: string;

        before(async () => {
          const agentPolicyId = await createAgentPolicy();
          const packagePolicyWithVersion = await createPackagePolicy(agentPolicyId, {
            name: 'agent_version_test',
            version: '1.0.0',
          });
          packagePolicyId = packagePolicyWithVersion.item.id;
          await createAgent(agentPolicyId, '8.12.0'); // incompatible with agent_version_test 1.1.0
        });

        it('should allow updating settings that cannot lead to agent version incompatibility', async () => {
          const { body } = await supertest
            .put(`/api/fleet/package_policies/${packagePolicyId}`)
            .set('kbn-xsrf', 'xxx')
            .send({
              name: 'Updated name',
              description: 'Updated description',
            })
            .expect(200);

          expect(body.item.name).to.eql('Updated name');
          expect(body.item.description).to.eql('Updated description');
        });

        it('should reject updating the package version', async () => {
          const { body } = await supertest
            .put(`/api/fleet/package_policies/${packagePolicyId}`)
            .set('kbn-xsrf', 'xxx')
            .send({
              package: {
                name: 'agent_version_test',
                version: '1.1.0',
              },
            })
            .expect(400);

          expect(body.message).to.contain('does not satisfy required version range');
          expect(body.message).to.contain('Use force:true to override');
        });

        it('should allow updating the package version with force=true', async () => {
          const { body } = await supertest
            .put(`/api/fleet/package_policies/${packagePolicyId}`)
            .set('kbn-xsrf', 'xxx')
            .send({
              package: {
                name: 'agent_version_test',
                version: '1.1.0',
              },
              force: true,
            })
            .expect(200);

          expect(body.item.package.version).to.eql('1.1.0');
        });
      });

      describe('when adding an agent policy with compatible agents', () => {
        let packagePolicyId: string;
        let newPolicyId: string;

        before(async () => {
          const oldAgentPolicyId = await createAgentPolicy();
          const packagePolicyWithVersion = await createPackagePolicy(oldAgentPolicyId, {
            name: 'agent_version_test',
            version: '1.0.0',
          });
          packagePolicyId = packagePolicyWithVersion.item.id;
          await createAgent(oldAgentPolicyId, '8.13.0'); // compatible with agent_version_test 1.0.0 and 1.1.0
          newPolicyId = await createAgentPolicy();
          await createAgent(newPolicyId, '8.13.0'); // compatible with agent_version_test 1.0.0 and 1.1.0
        });

        it('should allow updating', async () => {
          const { body } = await supertest
            .put(`/api/fleet/package_policies/${packagePolicyId}`)
            .set('kbn-xsrf', 'xxx')
            .send({
              policy_ids: [newPolicyId],
            })
            .expect(200);

          expect(body.item.policy_ids).to.contain(newPolicyId);
        });
      });

      describe('when adding an agent policy with incompatible agents', () => {
        let packagePolicyId: string;
        let newPolicyId: string;

        before(async () => {
          const oldAgentPolicyId = await createAgentPolicy();
          const packagePolicyWithVersion = await createPackagePolicy(oldAgentPolicyId, {
            name: 'agent_version_test',
            version: '1.0.0',
          });
          packagePolicyId = packagePolicyWithVersion.item.id;
          await createAgent(oldAgentPolicyId, '8.13.0'); // compatible with agent_version_test 1.0.0 and 1.1.0
          newPolicyId = await createAgentPolicy();
          await createAgent(newPolicyId, '8.11.0'); // incompatible with agent_version_test 1.0.0
        });

        it('should reject updating', async () => {
          const { body } = await supertest
            .put(`/api/fleet/package_policies/${packagePolicyId}`)
            .set('kbn-xsrf', 'xxx')
            .send({
              policy_ids: [newPolicyId],
            })
            .expect(400);

          expect(body.message).to.contain('does not satisfy required version range');
          expect(body.message).to.contain('Use force:true to override');
        });

        it('should allow updating if force=true', async () => {
          const { body } = await supertest
            .put(`/api/fleet/package_policies/${packagePolicyId}`)
            .set('kbn-xsrf', 'xxx')
            .send({
              policy_ids: [newPolicyId],
              force: true,
            })
            .expect(200);

          expect(body.item.policy_ids).to.contain(newPolicyId);
        });
      });
    });

    describe('POST /api/fleet/package_policies/upgrade', () => {
      describe('when the agent policy has agents on a compatible version with package upgrade', () => {
        let packagePolicyId: string;

        before(async () => {
          const agentPolicyId = await createAgentPolicy();
          const packagePolicyWithVersion = await createPackagePolicy(agentPolicyId, {
            name: 'agent_version_test',
            version: '1.0.0',
          });
          packagePolicyId = packagePolicyWithVersion.item.id;
          await createAgent(agentPolicyId, '8.13.0'); // compatible with agent_version_test 1.0.0 and 1.1.0
        });

        it('should allow upgrading', async () => {
          await supertest
            .post(`/api/fleet/package_policies/upgrade`)
            .set('kbn-xsrf', 'xxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(200);
        });
      });

      describe('when the agent policy has at least one agent on an incompatible version with package upgrade', () => {
        let packagePolicyId: string;

        before(async () => {
          const agentPolicyId = await createAgentPolicy();
          const packagePolicyWithVersion = await createPackagePolicy(agentPolicyId, {
            name: 'agent_version_test',
            version: '1.0.0',
          });
          packagePolicyId = packagePolicyWithVersion.item.id;
          await createAgent(agentPolicyId, '8.12.0'); // incompatible with agent_version_test 1.1.0
        });

        it('should reject upgrading', async () => {
          const { body } = await supertest
            .post(`/api/fleet/package_policies/upgrade`)
            .set('kbn-xsrf', 'xxx')
            .send({
              packagePolicyIds: [packagePolicyId],
            })
            .expect(400);

          expect(body.message).to.contain('does not satisfy required version range');
          expect(body.message).to.contain('Use force:true to override');
        });

        it('should allow upgrading if force=true', async () => {
          await supertest
            .post(`/api/fleet/package_policies/upgrade`)
            .set('kbn-xsrf', 'xxx')
            .send({
              packagePolicyIds: [packagePolicyId],
              force: true,
            })
            .expect(200);
        });
      });
    });

    describe('POST /api/fleet/package_policies/upgrade/dryrun', () => {
      it('should show error in dry run when agents incompatible', async () => {
        const agentPolicyId = await createAgentPolicy();
        const packagePolicyWithVersion = await createPackagePolicy(agentPolicyId, {
          name: 'agent_version_test',
          version: '1.0.0',
        });
        const packagePolicyId = packagePolicyWithVersion.item.id;
        await createAgent(agentPolicyId, '8.12.0'); // incompatible with agent_version_test 1.1.0

        const { body } = await supertest
          .post(`/api/fleet/package_policies/upgrade/dryrun`)
          .set('kbn-xsrf', 'xxx')
          .send({
            packagePolicyIds: [packagePolicyId],
          })
          .expect(200);

        expect(body).to.be.an('array');
        expect(body.length).to.be.greaterThan(0);
        const item = body[0];
        expect(item.diff).to.be.an('array');
        expect(item.diff.length).to.be.greaterThan(0);
        const proposedPolicy = item.diff[1];
        expect(proposedPolicy.errors).to.be.an('array');
        expect(proposedPolicy.errors.length).to.be.greaterThan(0);
        expect(proposedPolicy.errors[0].message).to.contain(
          'does not satisfy required version range'
        );
      });

      it('should show no errors in dry run when agents compatible', async () => {
        const agentPolicyId = await createAgentPolicy();
        const packagePolicyWithVersion = await createPackagePolicy(agentPolicyId, {
          name: 'agent_version_test',
          version: '1.0.0',
        });
        const packagePolicyId = packagePolicyWithVersion.item.id;
        await createAgent(agentPolicyId, '8.13.0'); // compatible with agent_version_test 1.0.0 and 1.1.0

        const { body } = await supertest
          .post(`/api/fleet/package_policies/upgrade/dryrun`)
          .set('kbn-xsrf', 'xxx')
          .send({
            packagePolicyIds: [packagePolicyId],
          })
          .expect(200);

        expect(body).to.be.an('array');
        expect(body.length).to.be.greaterThan(0);
        const item = body[0];
        expect(item.diff).to.be.an('array');
        expect(item.diff.length).to.be.greaterThan(0);
        const proposedPolicy = item.diff[1];
        expect(proposedPolicy.errors).to.be(undefined);
      });
    });
  });
}
