/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Client } from '@elastic/elasticsearch';
import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';

import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { cleanFleetIndices } from '../space_awareness/helpers';

// Versions of the `agent_version_condition` test package:
// 1.0.0 has no agent version condition, 1.1.0 requires `^9.3.0`, 1.2.0 requires `>=9.3.5`, and
// 1.3.0 removes the condition again.
const PKG_NAME = 'agent_version_condition';

interface TestAgent {
  status: 'online' | 'offline' | 'inactive' | 'uninstalled';
  version: string;
  opamp?: boolean;
}

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es: Client = getService('es');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  const installPackage = async (version: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${PKG_NAME}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  };

  const createAgentPolicy = async (agents: TestAgent[] = []): Promise<string> => {
    const { body } = await supertest
      .post('/api/fleet/agent_policies')
      .set('kbn-xsrf', 'xxxx')
      .send({ name: `agent-version-${uuidv4()}`, namespace: 'default', monitoring_enabled: [] })
      .expect(200);
    const agentPolicyId: string = body.item.id;
    await addAgents(agentPolicyId, agents);
    return agentPolicyId;
  };

  const addAgents = async (agentPolicyId: string, agents: TestAgent[]) => {
    for (const { status, version, opamp } of agents) {
      const agentId = `agent-${uuidv4()}`;
      await fleetAndAgents.generateAgent(
        status,
        agentId,
        agentPolicyId,
        version,
        undefined,
        undefined,
        true
      );
      if (opamp) {
        await es.update({
          index: '.fleet-agents',
          id: agentId,
          doc: { type: 'OPAMP' },
          refresh: true,
        });
      }
    }
  };

  const packagePolicyBody = (version: string, policyIds: string[]) => ({
    name: `${PKG_NAME}-${uuidv4()}`,
    namespace: 'default',
    policy_ids: policyIds,
    inputs: [],
    package: { name: PKG_NAME, title: 'Agent version condition', version },
  });

  const createPackagePolicy = async (
    version: string,
    policyIds: string[],
    { expected = 200, acknowledge = false }: { expected?: number; acknowledge?: boolean } = {}
  ) => {
    const { body } = await supertest
      .post('/api/fleet/package_policies')
      .set('kbn-xsrf', 'xxxx')
      .send({
        ...packagePolicyBody(version, policyIds),
        ...(acknowledge ? { acknowledge_agent_version_incompatibility: true } : {}),
      })
      .expect(expected);
    return body;
  };

  const upgradePackagePolicies = async (
    packagePolicyIds: string[],
    { expected = 200, acknowledge = false }: { expected?: number; acknowledge?: boolean } = {}
  ) => {
    const { body } = await supertest
      .post('/api/fleet/package_policies/upgrade')
      .set('kbn-xsrf', 'xxxx')
      .send({
        packagePolicyIds,
        ...(acknowledge ? { acknowledge_agent_version_incompatibility: true } : {}),
      })
      .expect(expected);
    return body;
  };

  const getPackagePolicyVersion = async (packagePolicyId: string): Promise<string> => {
    const { body } = await supertest
      .get(`/api/fleet/package_policies/${packagePolicyId}`)
      .expect(200);
    return body.item.package.version;
  };

  describe('Package policy - agent version conditions', function () {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
      await fleetAndAgents.setup();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await cleanFleetIndices(es);
    });

    describe('create', () => {
      before(async () => {
        await installPackage('1.1.0');
      });

      it('rejects a package policy that active agents would not run', async () => {
        const agentPolicyId = await createAgentPolicy([
          { status: 'online', version: '9.2.0' },
          { status: 'online', version: '9.4.0' },
        ]);

        const body = await createPackagePolicy('1.1.0', [agentPolicyId], { expected: 400 });

        expect(body.attributes.type).to.eql('agent_version_incompatible');
        expect(body.attributes.agent_version_block).to.eql({
          package_name: PKG_NAME,
          package_version: '1.1.0',
          version_condition: '^9.3.0',
          blocked_count: 1,
          observed_versions: ['9.2.0'],
          min_version: '9.3.0',
        });
        expect(body.message).to.contain('1 active agent on 9.2.0');
        expect(body.message).to.contain('Upgrade the agents to 9.3.0 or later.');
      });

      it('creates the package policy when the incompatibility is acknowledged', async () => {
        const agentPolicyId = await createAgentPolicy([{ status: 'online', version: '9.2.0' }]);

        await createPackagePolicy('1.1.0', [agentPolicyId], { acknowledge: true });
      });

      it('creates the package policy when every active agent satisfies the condition', async () => {
        const agentPolicyId = await createAgentPolicy([{ status: 'online', version: '9.4.0' }]);

        await createPackagePolicy('1.1.0', [agentPolicyId]);
      });

      it('creates the package policy on an agent policy without agents', async () => {
        const agentPolicyId = await createAgentPolicy();

        await createPackagePolicy('1.1.0', [agentPolicyId]);
      });

      it('counts offline agents', async () => {
        const agentPolicyId = await createAgentPolicy([{ status: 'offline', version: '9.2.0' }]);

        await createPackagePolicy('1.1.0', [agentPolicyId], { expected: 400 });
      });

      ['inactive', 'uninstalled'].forEach((status) => {
        it(`ignores ${status} agents`, async () => {
          const agentPolicyId = await createAgentPolicy([
            { status: status as TestAgent['status'], version: '9.2.0' },
          ]);

          await createPackagePolicy('1.1.0', [agentPolicyId]);
        });
      });

      it('ignores OpAMP agents', async () => {
        const agentPolicyId = await createAgentPolicy([
          { status: 'online', version: '9.2.0', opamp: true },
        ]);

        await createPackagePolicy('1.1.0', [agentPolicyId]);
      });
    });

    describe('agent policy response', () => {
      it('reports the versions of the agents the condition applies to', async () => {
        const agentPolicyId = await createAgentPolicy([
          { status: 'online', version: '9.4.0' },
          { status: 'inactive', version: '9.2.0' },
          { status: 'online', version: '9.1.0', opamp: true },
        ]);

        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyId}`)
          .expect(200);

        expect(body.item.active_agents_per_version).to.eql([{ version: '9.4.0', count: 1 }]);
        const allVersions = body.item.agents_per_version
          .map(({ version }: { version: string }) => version)
          .sort();
        expect(allVersions).to.eql(['9.1.0', '9.2.0', '9.4.0']);
      });
    });

    describe('upgrade', () => {
      let blockedPackagePolicyId: string;
      let acknowledgedPackagePolicyId: string;
      let compatiblePackagePolicyId: string;
      let withoutAgentsPackagePolicyId: string;
      let mixedBlockedPackagePolicyId: string;
      let mixedCompatiblePackagePolicyId: string;

      before(async () => {
        await installPackage('1.0.0');
        const oldAgents: TestAgent[] = [
          { status: 'online', version: '9.2.0' },
          { status: 'online', version: '9.4.0' },
        ];
        const createOnNewAgentPolicy = async (agents: TestAgent[]) =>
          (await createPackagePolicy('1.0.0', [await createAgentPolicy(agents)])).item.id;

        blockedPackagePolicyId = await createOnNewAgentPolicy(oldAgents);
        acknowledgedPackagePolicyId = await createOnNewAgentPolicy(oldAgents);
        compatiblePackagePolicyId = await createOnNewAgentPolicy([
          { status: 'online', version: '9.4.0' },
        ]);
        withoutAgentsPackagePolicyId = await createOnNewAgentPolicy([]);
        mixedBlockedPackagePolicyId = await createOnNewAgentPolicy(oldAgents);
        mixedCompatiblePackagePolicyId = await createOnNewAgentPolicy([
          { status: 'online', version: '9.4.0' },
        ]);

        await installPackage('1.1.0');
      });

      it('reports the blocking agents in the dry run without an error', async () => {
        const { body } = await supertest
          .post('/api/fleet/package_policies/upgrade/dryrun')
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [blockedPackagePolicyId] })
          .expect(200);

        expect(body[0].hasErrors).to.be(false);
        expect(body[0].agent_version_block).to.eql({
          package_name: PKG_NAME,
          package_version: '1.1.0',
          version_condition: '^9.3.0',
          blocked_count: 1,
          observed_versions: ['9.2.0'],
          min_version: '9.3.0',
        });
      });

      it('reports the blocking agents for a package version that is not installed yet', async () => {
        const { body } = await supertest
          .post('/api/fleet/package_policies/upgrade/dryrun')
          .set('kbn-xsrf', 'xxxx')
          .send({ packagePolicyIds: [blockedPackagePolicyId], packageVersion: '1.2.0' })
          .expect(200);

        expect(body[0].hasErrors).to.be(false);
        expect(body[0].diff[1].package.version).to.eql('1.2.0');
        expect(body[0].agent_version_block).to.eql({
          package_name: PKG_NAME,
          package_version: '1.2.0',
          version_condition: '>=9.3.5',
          blocked_count: 1,
          observed_versions: ['9.2.0'],
          min_version: '9.4.0',
        });
      });

      it('rejects the upgrade when active agents would not run the new version', async () => {
        const body = await upgradePackagePolicies([blockedPackagePolicyId], { expected: 400 });

        expect(body.message).to.contain(`Cannot upgrade ${PKG_NAME} to 1.1.0`);
        expect(body.message).to.contain('9.2.0');
        expect(await getPackagePolicyVersion(blockedPackagePolicyId)).to.eql('1.0.0');
      });

      it('upgrades when the incompatibility is acknowledged', async () => {
        await upgradePackagePolicies([acknowledgedPackagePolicyId], { acknowledge: true });

        expect(await getPackagePolicyVersion(acknowledgedPackagePolicyId)).to.eql('1.1.0');
      });

      it('upgrades when every active agent satisfies the condition', async () => {
        await upgradePackagePolicies([compatiblePackagePolicyId]);

        expect(await getPackagePolicyVersion(compatiblePackagePolicyId)).to.eql('1.1.0');
      });

      it('upgrades a package policy without agents', async () => {
        await upgradePackagePolicies([withoutAgentsPackagePolicyId]);

        expect(await getPackagePolicyVersion(withoutAgentsPackagePolicyId)).to.eql('1.1.0');
      });

      it('returns per-item results when only some package policies can be upgraded', async () => {
        const body = await upgradePackagePolicies([
          mixedBlockedPackagePolicyId,
          mixedCompatiblePackagePolicyId,
        ]);

        const blockedItem = body.find(
          ({ id }: { id: string }) => id === mixedBlockedPackagePolicyId
        );
        const compatibleItem = body.find(
          ({ id }: { id: string }) => id === mixedCompatiblePackagePolicyId
        );
        expect(blockedItem.success).to.be(false);
        expect(blockedItem.statusCode).to.eql(400);
        expect(blockedItem.body.attributes.type).to.eql('agent_version_incompatible');
        expect(compatibleItem.success).to.be(true);
        expect(await getPackagePolicyVersion(mixedBlockedPackagePolicyId)).to.eql('1.0.0');
        expect(await getPackagePolicyVersion(mixedCompatiblePackagePolicyId)).to.eql('1.1.0');
      });
    });

    describe('update', () => {
      let versionBumpPackagePolicyId: string;
      let attachPackagePolicyId: string;
      let attachAgentPolicyId: string;
      let oldAgentsAgentPolicyId: string;
      let editedPackagePolicyId: string;

      before(async () => {
        await installPackage('1.0.0');
        versionBumpPackagePolicyId = (
          await createPackagePolicy('1.0.0', [
            await createAgentPolicy([{ status: 'online', version: '9.2.0' }]),
          ])
        ).item.id;

        await installPackage('1.1.0');
        attachAgentPolicyId = await createAgentPolicy();
        attachPackagePolicyId = (await createPackagePolicy('1.1.0', [attachAgentPolicyId])).item.id;
        oldAgentsAgentPolicyId = await createAgentPolicy([{ status: 'online', version: '9.2.0' }]);

        // Agents enrolled after the package policy was added: an existing affected package policy
        const editedAgentPolicyId = await createAgentPolicy();
        editedPackagePolicyId = (await createPackagePolicy('1.1.0', [editedAgentPolicyId])).item.id;
        await addAgents(editedAgentPolicyId, [{ status: 'online', version: '9.2.0' }]);
      });

      it('rejects a change of package version that active agents would not run', async () => {
        const { body } = await supertest
          .put(`/api/fleet/package_policies/${versionBumpPackagePolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ package: { name: PKG_NAME, title: 'Agent version condition', version: '1.1.0' } })
          .expect(400);

        expect(body.attributes.type).to.eql('agent_version_incompatible');
        expect(await getPackagePolicyVersion(versionBumpPackagePolicyId)).to.eql('1.0.0');
      });

      it('rejects adding an agent policy whose active agents would not run the package', async () => {
        const { body } = await supertest
          .put(`/api/fleet/package_policies/${attachPackagePolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ policy_ids: [attachAgentPolicyId, oldAgentsAgentPolicyId] })
          .expect(400);

        expect(body.message).to.contain(`Cannot add ${PKG_NAME} 1.1.0`);
      });

      it('does not check other edits', async () => {
        await supertest
          .put(`/api/fleet/package_policies/${editedPackagePolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ description: 'edited' })
          .expect(200);
      });
    });

    describe('version-specific policy semantics', () => {
      let packagePolicyId: string;

      before(async () => {
        await installPackage('1.0.0');
        packagePolicyId = (
          await createPackagePolicy('1.0.0', [
            await createAgentPolicy([{ status: 'online', version: '9.3.8' }]),
          ])
        ).item.id;
        await installPackage('1.2.0');
      });

      it('evaluates agents at their major.minor, as their version-specific policy does', async () => {
        // 9.3.8 satisfies `>=9.3.5`, but the inputs of its `9.3` policy are filtered at 9.3.0, so
        // the agent needs 9.4.0
        const body = await upgradePackagePolicies([packagePolicyId], { expected: 400 });

        expect(body.message).to.contain('9.3.8');
        expect(body.message).to.contain('Upgrade the agents to 9.4.0 or later.');
      });
    });

    describe('upgrading away from an agent version condition', () => {
      let packagePolicyId: string;

      before(async () => {
        await installPackage('1.1.0');
        const agentPolicyId = await createAgentPolicy();
        packagePolicyId = (await createPackagePolicy('1.1.0', [agentPolicyId])).item.id;
        // Agents enrolled after the package policy was added: an existing affected package policy
        await addAgents(agentPolicyId, [{ status: 'online', version: '9.2.0' }]);
        await installPackage('1.3.0');
      });

      it('is never blocked', async () => {
        await upgradePackagePolicies([packagePolicyId]);

        expect(await getPackagePolicyVersion(packagePolicyId)).to.eql('1.3.0');
      });
    });

    describe('bulk package upgrade', () => {
      let blockedPackagePolicy: { id: string; name: string };
      let compatiblePackagePolicyId: string;

      before(async () => {
        // The task upgrades every package policy of the package, so start without the others
        await kibanaServer.savedObjects.cleanStandardList();
        await cleanFleetIndices(es);
        await fleetAndAgents.setup();

        await installPackage('1.0.0');
        blockedPackagePolicy = (
          await createPackagePolicy('1.0.0', [
            await createAgentPolicy([{ status: 'online', version: '9.2.0' }]),
          ])
        ).item;
        compatiblePackagePolicyId = (
          await createPackagePolicy('1.0.0', [
            await createAgentPolicy([{ status: 'online', version: '9.4.0' }]),
          ])
        ).item.id;
      });

      it('succeeds and reports the package policies skipped because of their agents', async () => {
        const { body } = await supertest
          .post('/api/fleet/epm/packages/_bulk_upgrade')
          .set('kbn-xsrf', 'xxxx')
          .send({
            packages: [{ name: PKG_NAME, version: '1.1.0' }],
            upgrade_package_policies: true,
          })
          .expect(200);

        const maxTimeout = Date.now() + 60 * 1000;
        let pollResult: { status: string; results?: Array<Record<string, unknown>> } = {
          status: 'pending',
        };
        while (pollResult.status === 'pending' && Date.now() < maxTimeout) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          pollResult = (
            await supertest
              .get(`/api/fleet/epm/packages/_bulk_upgrade/${body.taskId}`)
              .set('kbn-xsrf', 'xxxx')
              .expect(200)
          ).body;
        }

        expect(pollResult.status).to.eql('success');
        expect(pollResult.results).to.eql([
          {
            name: PKG_NAME,
            success: true,
            skipped_package_policies: [
              {
                id: blockedPackagePolicy.id,
                name: blockedPackagePolicy.name,
                version_condition: '^9.3.0',
              },
            ],
          },
        ]);
        expect(await getPackagePolicyVersion(blockedPackagePolicy.id)).to.eql('1.0.0');
        expect(await getPackagePolicyVersion(compatiblePackagePolicyId)).to.eql('1.1.0');
      });
    });
  });
}
