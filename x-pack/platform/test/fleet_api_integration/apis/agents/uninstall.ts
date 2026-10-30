/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  AGENTS_INDEX,
  AGENT_ACTIONS_INDEX,
  AGENT_ACTIONS_RESULTS_INDEX,
} from '@kbn/fleet-plugin/common';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { testUsers } from '../test_users';

const ONE_HOUR_SECONDS = 60 * 60;
const ONE_DAY_SECONDS = 24 * ONE_HOUR_SECONDS;

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  // 'policy1' is the policy ID pre-loaded by the fleet/agents archive fixture.
  const ARCHIVE_POLICY_ID = 'policy1';
  const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };

  async function createAgent(
    agentId: string,
    {
      uninstallable = true,
      uninstallPending = true,
      unprivileged = false,
      active = true,
      policyId = ARCHIVE_POLICY_ID,
    }: {
      uninstallable?: boolean;
      uninstallPending?: boolean;
      unprivileged?: boolean;
      active?: boolean;
      policyId?: string;
    } = {}
  ) {
    const now = new Date().toISOString();
    await es.index({
      refresh: 'wait_for',
      index: AGENTS_INDEX,
      id: agentId,
      document: {
        id: agentId,
        type: 'PERMANENT',
        active,
        enrolled_at: now,
        last_checkin: now,
        policy_id: policyId,
        policy_base_id: policyId,
        policy_revision: 1,
        policy_revision_idx: 1,
        namespaces: ['default'],
        uninstall_pending: uninstallPending,
        agent: { id: agentId, version: '9.7.0' },
        local_metadata: {
          host: { hostname: `host-${agentId}` },
          elastic: {
            agent: {
              version: '9.7.0',
              ...(uninstallable ? { uninstallable: true } : {}),
              ...(unprivileged ? { unprivileged: true } : {}),
            },
          },
        },
      },
    });
  }

  async function getActionResultsForAction(actionId: string) {
    const res = await es.search(
      { index: AGENT_ACTIONS_RESULTS_INDEX, query: { term: { action_id: actionId } } },
      ES_INDEX_OPTIONS
    );
    return res.hits.hits.map((hit) => hit._source as any);
  }

  async function getActionById(actionId: string) {
    const res = await es.search({
      index: AGENT_ACTIONS_INDEX,
      query: { term: { action_id: actionId } },
    });
    return res.hits.hits[0]?._source as any;
  }

  async function countUninstallActions() {
    const res = await es.search({
      index: AGENT_ACTIONS_INDEX,
      query: { term: { type: 'UNINSTALL' } },
    });
    return (res.hits.total as { value: number }).value;
  }

  async function createManagedPolicy() {
    const res = await supertest
      .post(`/api/fleet/agent_policies`)
      .set('kbn-xsrf', 'xx')
      .send({ name: `Managed policy ${Date.now()}`, namespace: 'default', is_managed: true })
      .expect(200);
    return res.body.item;
  }

  describe('fleet_agents_uninstall', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });

    beforeEach(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/agents');
      await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').send();
    });

    afterEach(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/agents');
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    describe('POST /agents/{agentId}/uninstall', () => {
      it('creates a scheduled UNINSTALL action with the default 1h grace period', async () => {
        await createAgent('uninstall-ok');
        const before = Date.now();

        const { body } = await supertest
          .post(`/api/fleet/agents/uninstall-ok/uninstall`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(body.actionId).to.be.a('string');
        const action = await getActionById(body.actionId);
        expect(action.type).to.eql('UNINSTALL');
        expect(action.agents).to.eql(['uninstall-ok']);

        const startMs = Date.parse(action.start_time);
        expect(startMs).to.be.greaterThan(before + ONE_HOUR_SECONDS * 1000 - 1);
        expect(startMs).to.be.lessThan(Date.now() + ONE_HOUR_SECONDS * 1000 + 1);
        expect(Date.parse(action.expiration)).to.be.greaterThan(startMs);
      });

      it('honors a custom delay_seconds', async () => {
        await createAgent('uninstall-delay');
        const before = Date.now();

        const { body } = await supertest
          .post(`/api/fleet/agents/uninstall-delay/uninstall`)
          .set('kbn-xsrf', 'xxx')
          .send({ delay_seconds: 6 * ONE_HOUR_SECONDS })
          .expect(200);

        const action = await getActionById(body.actionId);
        expect(Date.parse(action.start_time)).to.be.greaterThan(
          before + 6 * ONE_HOUR_SECONDS * 1000 - 1
        );
      });

      [0, ONE_HOUR_SECONDS - 1, ONE_DAY_SECONDS + 1, -ONE_HOUR_SECONDS, 3600.5].forEach((delay) => {
        it(`returns 400 and creates no action for delay_seconds ${delay}`, async () => {
          await createAgent('uninstall-bad-delay');
          const before = await countUninstallActions();

          await supertest
            .post(`/api/fleet/agents/uninstall-bad-delay/uninstall`)
            .set('kbn-xsrf', 'xxx')
            .send({ delay_seconds: delay })
            .expect(400);

          expect(await countUninstallActions()).to.eql(before);
        });
      });

      it('accepts the minimum and maximum delay', async () => {
        await createAgent('uninstall-bounds');

        await supertest
          .post(`/api/fleet/agents/uninstall-bounds/uninstall`)
          .set('kbn-xsrf', 'xxx')
          .send({ delay_seconds: ONE_HOUR_SECONDS })
          .expect(200);
        await supertest
          .post(`/api/fleet/agents/uninstall-bounds/uninstall`)
          .set('kbn-xsrf', 'xxx')
          .send({ delay_seconds: ONE_DAY_SECONDS })
          .expect(200);
      });

      [
        ['has no uninstallable flag', { uninstallable: false }],
        ['is not unenrolled (not pending uninstall)', { uninstallPending: false }],
        ['is unprivileged', { unprivileged: true }],
        ['is inactive', { active: false }],
      ].forEach(([description, options]) => {
        it(`returns 400 and creates no action when the agent ${description}`, async () => {
          await createAgent('uninstall-ineligible', options as Record<string, boolean>);
          const before = await countUninstallActions();

          await supertest
            .post(`/api/fleet/agents/uninstall-ineligible/uninstall`)
            .set('kbn-xsrf', 'xxx')
            .expect(400);

          expect(await countUninstallActions()).to.eql(before);
        });
      });

      it('returns 400 for an agent in a hosted/managed policy', async () => {
        const managedPolicy = await createManagedPolicy();
        await createAgent('uninstall-hosted', { policyId: managedPolicy.id });

        await supertest
          .post(`/api/fleet/agents/uninstall-hosted/uninstall`)
          .set('kbn-xsrf', 'xxx')
          .expect(400);
      });

      it('returns 404 for an unknown agent', async () => {
        await supertest
          .post(`/api/fleet/agents/does-not-exist/uninstall`)
          .set('kbn-xsrf', 'xxx')
          .expect(404);
      });

      it('returns 403 for a user without fleet agents all privileges', async () => {
        await createAgent('uninstall-forbidden');
        const before = await countUninstallActions();

        for (const user of [
          testUsers.fleet_no_access,
          testUsers.fleet_read_only,
          testUsers.fleet_agents_read_only,
        ]) {
          await supertestWithoutAuth
            .post(`/api/fleet/agents/uninstall-forbidden/uninstall`)
            .set('kbn-xsrf', 'xxx')
            .auth(user.username, user.password)
            .expect(403);
        }

        expect(await countUninstallActions()).to.eql(before);
      });

      it('allows a user with only fleet agents all privileges', async () => {
        await createAgent('uninstall-agents-all');

        await supertestWithoutAuth
          .post(`/api/fleet/agents/uninstall-agents-all/uninstall`)
          .set('kbn-xsrf', 'xxx')
          .auth(testUsers.fleet_agents_all_only.username, testUsers.fleet_agents_all_only.password)
          .expect(200);
      });

      it('can cancel a pending UNINSTALL action during the grace period', async () => {
        await createAgent('uninstall-cancel');
        const { body } = await supertest
          .post(`/api/fleet/agents/uninstall-cancel/uninstall`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        await supertest
          .post(`/api/fleet/agents/actions/${body.actionId}/cancel`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const res = await es.search({
          index: AGENT_ACTIONS_INDEX,
          query: { term: { type: 'CANCEL' } },
        });
        const cancelAction = res.hits.hits
          .map((hit) => hit._source as any)
          .find((action) => action.data?.target_id === body.actionId);
        expect(cancelAction).to.be.ok();
        expect(cancelAction.agents).to.contain('uninstall-cancel');
      });

      it('shows the UNINSTALL type in the action status API', async () => {
        await createAgent('uninstall-status');
        const { body } = await supertest
          .post(`/api/fleet/agents/uninstall-status/uninstall`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const { body: statusBody } = await supertest
          .get(`/api/fleet/agents/action_status`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const actionStatus = statusBody.items.find((a: any) => a.actionId === body.actionId);
        expect(actionStatus).to.be.ok();
        expect(actionStatus.type).to.eql('UNINSTALL');
      });
    });

    describe('POST /agents/bulk_uninstall', () => {
      it('creates the action only for eligible agents and writes error results for the rest', async () => {
        await createAgent('bulk-ok-1');
        await createAgent('bulk-ok-2');
        await createAgent('bulk-no-flag', { uninstallable: false });
        await createAgent('bulk-enrolled', { uninstallPending: false });
        await createAgent('bulk-unprivileged', { unprivileged: true });

        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_uninstall`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: [
              'bulk-ok-1',
              'bulk-ok-2',
              'bulk-no-flag',
              'bulk-enrolled',
              'bulk-unprivileged',
              'bulk-missing',
            ],
            delay_seconds: 2 * ONE_HOUR_SECONDS,
          })
          .expect(200);

        const action = await getActionById(body.actionId);
        expect(action.type).to.eql('UNINSTALL');
        expect(action.agents.sort()).to.eql(['bulk-ok-1', 'bulk-ok-2']);
        expect(Date.parse(action.start_time)).to.be.greaterThan(
          Date.now() + ONE_HOUR_SECONDS * 1000
        );

        const results = await getActionResultsForAction(body.actionId);
        const errorFor = (agentId: string) => results.find((r: any) => r.agent_id === agentId);
        expect(errorFor('bulk-no-flag').error).to.match(/does not support the uninstall action/i);
        expect(errorFor('bulk-enrolled').error).to.match(/must be unenrolled/i);
        expect(errorFor('bulk-unprivileged').error).to.match(/unprivileged/i);
        expect(errorFor('bulk-missing')).to.be.ok();
        expect(errorFor('bulk-ok-1')).to.be(undefined);
      });

      it('returns an actionId with an empty agent list when no agent is eligible', async () => {
        await createAgent('none-1', { uninstallPending: false });
        await createAgent('none-2', { uninstallable: false });

        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_uninstall`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['none-1', 'none-2'] })
          .expect(200);

        const action = await getActionById(body.actionId);
        expect(action.agents).to.eql([]);
        expect(await getActionResultsForAction(body.actionId)).to.have.length(2);
      });

      it('creates the action via a kuery for eligible agents', async () => {
        await createAgent('kuery-ok');
        await createAgent('kuery-no-flag', { uninstallable: false });

        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_uninstall`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: 'local_metadata.elastic.agent.version : "9.7.0"' })
          .expect(200);

        const action = await getActionById(body.actionId);
        expect(action.agents).to.contain('kuery-ok');
        expect(action.agents).not.to.contain('kuery-no-flag');
      });

      it('excludes agents in hosted policies', async () => {
        const managedPolicy = await createManagedPolicy();
        await createAgent('bulk-hosted', { policyId: managedPolicy.id });
        await createAgent('bulk-free');

        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_uninstall`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['bulk-hosted', 'bulk-free'] })
          .expect(200);

        const action = await getActionById(body.actionId);
        expect(action.agents).to.eql(['bulk-free']);
        const results = await getActionResultsForAction(body.actionId);
        expect(results.find((r: any) => r.agent_id === 'bulk-hosted').error).to.match(
          /hosted agent policy/i
        );
      });

      [0, ONE_HOUR_SECONDS - 1, ONE_DAY_SECONDS + 1].forEach((delay) => {
        it(`returns 400 and creates no action for delay_seconds ${delay}`, async () => {
          await createAgent('bulk-bad-delay');
          const before = await countUninstallActions();

          await supertest
            .post(`/api/fleet/agents/bulk_uninstall`)
            .set('kbn-xsrf', 'xxx')
            .send({ agents: ['bulk-bad-delay'], delay_seconds: delay })
            .expect(400);

          expect(await countUninstallActions()).to.eql(before);
        });
      });

      it('returns 403 for a user without fleet agents all privileges', async () => {
        await createAgent('bulk-forbidden');
        const before = await countUninstallActions();

        await supertestWithoutAuth
          .post(`/api/fleet/agents/bulk_uninstall`)
          .set('kbn-xsrf', 'xxx')
          .auth(
            testUsers.fleet_agents_read_only.username,
            testUsers.fleet_agents_read_only.password
          )
          .send({ agents: ['bulk-forbidden'] })
          .expect(403);

        expect(await countUninstallActions()).to.eql(before);
      });
    });
  });
}
