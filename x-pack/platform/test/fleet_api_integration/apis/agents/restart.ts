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

const SUPPORTED_VERSION = '9.6.0';
const UNSUPPORTED_VERSION = '9.5.0';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  // 'policy1' is the policy ID pre-loaded by the fleet/agents archive fixture.
  const ARCHIVE_POLICY_ID = 'policy1';

  async function createAgent(
    agentId: string,
    version: string,
    policyId?: string,
    policyBaseId?: string
  ) {
    const now = new Date().toISOString();
    const resolvedPolicyId = policyId ?? ARCHIVE_POLICY_ID;
    await es.index({
      refresh: 'wait_for',
      index: AGENTS_INDEX,
      id: agentId,
      document: {
        id: agentId,
        type: 'PERMANENT',
        active: true,
        enrolled_at: now,
        last_checkin: now,
        policy_id: resolvedPolicyId,
        policy_base_id: policyBaseId ?? resolvedPolicyId,
        policy_revision: 1,
        policy_revision_idx: 1,
        namespaces: ['default'],
        agent: { id: agentId, version },
        local_metadata: {
          host: { hostname: `host-${agentId}` },
          elastic: { agent: { version } },
        },
      },
    });
  }

  const ES_INDEX_OPTIONS = { headers: { 'X-elastic-product-origin': 'fleet' } };

  async function getActionResultsForAction(actionId: string) {
    const res = await es.search(
      {
        index: AGENT_ACTIONS_RESULTS_INDEX,
        query: { term: { action_id: actionId } },
      },
      ES_INDEX_OPTIONS
    );
    return res.hits.hits.map((h: any) => h._source);
  }

  async function getLatestAction() {
    const res = await es.search({
      index: AGENT_ACTIONS_INDEX,
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: 1,
    });
    return res.hits.hits[0]?._source as any;
  }

  describe('fleet_agents_restart', () => {
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

    async function countRestartActionsInIndex() {
      const res = await es.search({
        index: AGENT_ACTIONS_INDEX,
        query: { term: { type: 'RESTART' } },
      });
      return res.hits.total as { value: number };
    }

    async function createManagedPolicy() {
      const res = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xx')
        .send({ name: `Managed policy ${Date.now()}`, namespace: 'default', is_managed: true })
        .expect(200);
      return res.body.item;
    }

    describe('single agent restart', () => {
      it('returns 400 for agent below minimum version', async () => {
        await createAgent('restart-old', UNSUPPORTED_VERSION);

        await supertest
          .post(`/api/fleet/agents/restart-old/restart`)
          .set('kbn-xsrf', 'xxx')
          .expect(400);
      });

      it('does not create a RESTART action document when returning 400', async () => {
        await createAgent('restart-old-clean', UNSUPPORTED_VERSION);

        const before = await countRestartActionsInIndex();

        await supertest
          .post(`/api/fleet/agents/restart-old-clean/restart`)
          .set('kbn-xsrf', 'xxx')
          .expect(400);

        const after = await countRestartActionsInIndex();
        expect(after.value).to.eql(before.value);
      });

      it('creates RESTART action for supported agent', async () => {
        await createAgent('restart-new', SUPPORTED_VERSION);

        const { body } = await supertest
          .post(`/api/fleet/agents/restart-new/restart`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        expect(body.actionId).to.be.a('string');

        const action = await getLatestAction();
        expect(action.type).to.eql('RESTART');
        expect(action.agents).to.contain('restart-new');
      });

      it('returns 400 for agent in hosted/managed policy', async () => {
        const managedPolicy = await createManagedPolicy();
        await createAgent('restart-hosted', SUPPORTED_VERSION, managedPolicy.id);

        await supertest
          .post(`/api/fleet/agents/restart-hosted/restart`)
          .set('kbn-xsrf', 'xxx')
          .expect(400);
      });
    });

    describe('pending restart', () => {
      function restart(agentId: string, body?: object) {
        return supertest
          .post(`/api/fleet/agents/${agentId}/restart`)
          .set('kbn-xsrf', 'xxx')
          .send(body);
      }

      async function writeActionResult(actionId: string, agentId: string) {
        await es.index(
          {
            index: AGENT_ACTIONS_RESULTS_INDEX,
            refresh: true,
            op_type: 'create',
            document: {
              action_id: actionId,
              agent_id: agentId,
              '@timestamp': new Date().toISOString(),
            },
          },
          ES_INDEX_OPTIONS
        );
      }

      it('returns 409 when the agent already has a pending restart', async () => {
        await createAgent('pending-single', SUPPORTED_VERSION);
        await restart('pending-single').expect(200);

        const before = await countRestartActionsInIndex();
        const { body } = await restart('pending-single').expect(409);
        expect(body.message).to.match(/already has a pending restart action/);

        const after = await countRestartActionsInIndex();
        expect(after.value).to.eql(before.value);
      });

      it('creates a new RESTART action with force when a restart is pending', async () => {
        await createAgent('pending-force', SUPPORTED_VERSION);
        const { body: first } = await restart('pending-force').expect(200);

        const { body: second } = await restart('pending-force', { force: true }).expect(200);
        expect(second.actionId).not.to.eql(first.actionId);
      });

      it('allows a new restart once the previous one has a result', async () => {
        await createAgent('pending-acked', SUPPORTED_VERSION);
        const { body } = await restart('pending-acked').expect(200);
        await writeActionResult(body.actionId, 'pending-acked');

        await restart('pending-acked').expect(200);
      });

      it('returns pending_restart on the agent when withPendingRestart is set', async () => {
        await createAgent('pending-get', SUPPORTED_VERSION);
        const { body } = await restart('pending-get').expect(200);

        const { body: agentBody } = await supertest
          .get(`/api/fleet/agents/pending-get?withPendingRestart=true`)
          .expect(200);
        expect(agentBody.item.pending_restart.action_id).to.eql(body.actionId);

        const { body: listBody } = await supertest
          .get(`/api/fleet/agents?withPendingRestart=true&kuery=agent.id:pending-get`)
          .expect(200);
        expect(listBody.items[0].pending_restart.action_id).to.eql(body.actionId);

        const { body: withoutFlagBody } = await supertest
          .get(`/api/fleet/agents/pending-get`)
          .expect(200);
        expect(withoutFlagBody.item.pending_restart).to.be(undefined);
      });

      it('bulk restart writes an error result for agents with a pending restart', async () => {
        await createAgent('bulk-pending', SUPPORTED_VERSION);
        await createAgent('bulk-free', SUPPORTED_VERSION);
        await restart('bulk-pending').expect(200);

        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_restart`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['bulk-pending', 'bulk-free'] })
          .expect(200);

        const action = await getLatestAction();
        expect(action.agents).to.eql(['bulk-free']);

        const errorResults = await getActionResultsForAction(body.actionId);
        const pendingError = errorResults.find((r: any) => r.agent_id === 'bulk-pending');
        expect(pendingError.error).to.match(/already has a pending restart action/);
      });

      it('bulk restart with force includes agents with a pending restart', async () => {
        await createAgent('bulk-pending-force', SUPPORTED_VERSION);
        await restart('bulk-pending-force').expect(200);

        await supertest
          .post(`/api/fleet/agents/bulk_restart`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['bulk-pending-force'], force: true })
          .expect(200);

        const action = await getLatestAction();
        expect(action.agents).to.eql(['bulk-pending-force']);
      });
    });

    describe('bulk restart — mixed supported/unsupported agents', () => {
      it('creates action only for supported agents and writes error results for unsupported', async () => {
        await createAgent('bulk-supported-1', SUPPORTED_VERSION);
        await createAgent('bulk-supported-2', SUPPORTED_VERSION);
        await createAgent('bulk-old-1', UNSUPPORTED_VERSION);

        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_restart`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['bulk-supported-1', 'bulk-supported-2', 'bulk-old-1'] })
          .expect(200);

        expect(body.actionId).to.be.a('string');
        const actionId = body.actionId;

        // Action document should only list supported agents
        const action = await getLatestAction();
        expect(action.type).to.eql('RESTART');
        expect(action.agents).to.contain('bulk-supported-1');
        expect(action.agents).to.contain('bulk-supported-2');
        expect(action.agents).not.to.contain('bulk-old-1');

        // Error result should exist for the unsupported agent
        const errorResults = await getActionResultsForAction(actionId);
        const errorForOld = errorResults.find((r: any) => r.agent_id === 'bulk-old-1');
        expect(errorForOld).to.be.ok();
        expect(errorForOld.error).to.match(/does not support the restart action/i);
      });

      it('returns actionId when all agents are unsupported — action created with empty agent list', async () => {
        await createAgent('all-old-1', UNSUPPORTED_VERSION);
        await createAgent('all-old-2', UNSUPPORTED_VERSION);

        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_restart`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['all-old-1', 'all-old-2'] })
          .expect(200);

        expect(body.actionId).to.be.a('string');

        const errorResults = await getActionResultsForAction(body.actionId);
        expect(errorResults).to.have.length(2);
        const agentIds = errorResults.map((r: any) => r.agent_id);
        expect(agentIds).to.contain('all-old-1');
        expect(agentIds).to.contain('all-old-2');
      });

      it('action status API shows RESTART type for created action', async () => {
        await createAgent('status-agent', SUPPORTED_VERSION);

        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_restart`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['status-agent'] })
          .expect(200);

        const { body: statusBody } = await supertest
          .get(`/api/fleet/agents/action_status`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const actionStatus = statusBody.items.find((a: any) => a.actionId === body.actionId);
        expect(actionStatus).to.be.ok();
        expect(actionStatus.type).to.eql('RESTART');
      });

      it('creates action via kuery string for active agents', async () => {
        await createAgent('kuery-supported-1', SUPPORTED_VERSION);
        await createAgent('kuery-supported-2', SUPPORTED_VERSION);

        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_restart`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: `local_metadata.elastic.agent.version : "${SUPPORTED_VERSION}"` })
          .expect(200);

        expect(body.actionId).to.be.a('string');

        const action = await getLatestAction();
        expect(action.type).to.eql('RESTART');
        expect(action.agents).to.contain('kuery-supported-1');
        expect(action.agents).to.contain('kuery-supported-2');
      });

      it('kuery path with includeInactive:false excludes inactive agents', async () => {
        await createAgent('kuery-active', SUPPORTED_VERSION);
        // create inactive agent
        await es.index({
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          id: 'kuery-inactive',
          document: {
            id: 'kuery-inactive',
            type: 'PERMANENT',
            active: false,
            enrolled_at: new Date().toISOString(),
            last_checkin: new Date().toISOString(),
            policy_id: ARCHIVE_POLICY_ID,
            policy_revision: 1,
            policy_revision_idx: 1,
            namespaces: ['default'],
            agent: { id: 'kuery-inactive', version: SUPPORTED_VERSION },
            local_metadata: {
              host: { hostname: 'host-kuery-inactive' },
              elastic: { agent: { version: SUPPORTED_VERSION } },
            },
          },
        });

        await supertest
          .post(`/api/fleet/agents/bulk_restart`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: `local_metadata.elastic.agent.version : "${SUPPORTED_VERSION}"`,
            includeInactive: false,
          })
          .expect(200);

        const action = await getLatestAction();
        expect(action.agents).to.contain('kuery-active');
        expect(action.agents).not.to.contain('kuery-inactive');
      });
    });

    describe('bulk restart — hosted policy restriction', () => {
      it('writes error results for agents in managed policy, creates action only for eligible agents', async () => {
        const managedPolicy = await createManagedPolicy();
        await createAgent('hosted-agent', SUPPORTED_VERSION, managedPolicy.id);
        await createAgent('free-agent', SUPPORTED_VERSION);

        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_restart`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['hosted-agent', 'free-agent'] })
          .expect(200);

        const actionId = body.actionId;

        const action = await getLatestAction();
        expect(action.type).to.eql('RESTART');
        expect(action.agents).to.contain('free-agent');
        expect(action.agents).not.to.contain('hosted-agent');

        const errorResults = await getActionResultsForAction(actionId);
        const hostedError = errorResults.find((r: any) => r.agent_id === 'hosted-agent');
        expect(hostedError).to.be.ok();
        expect(hostedError.error).to.match(/hosted agent policy/i);
      });
    });
  });
}
