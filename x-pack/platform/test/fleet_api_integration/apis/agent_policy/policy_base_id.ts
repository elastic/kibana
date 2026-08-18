/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENTS_INDEX, AGENT_POLICY_INDEX } from '@kbn/fleet-plugin/common';
import { skipIfNoDockerRegistry } from '../../helpers';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const fleetAndAgents = getService('fleetAndAgents');
  const kibanaServer = getService('kibanaServer');

  describe('fleet_policy_base_id', () => {
    skipIfNoDockerRegistry(providerContext);

    // ─── policy_base_id on .fleet-policies documents ──────────────────────────

    describe('policy_base_id on .fleet-policies documents', () => {
      let agentPolicyId: string;

      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();

        const { body } = await supertest
          .post('/api/fleet/agent_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({ name: 'policy_base_id doc test', namespace: 'default', force: true })
          .expect(200);
        agentPolicyId = body.item.id;
      });

      after(async () => {
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
        await esArchiver.unload(
          'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
        );
      });

      it('should set policy_base_id on .fleet-policies documents equal to base policy id', async () => {
        const result = await es.search({
          index: AGENT_POLICY_INDEX,
          query: { term: { policy_id: agentPolicyId } },
        });

        expect(result.hits.hits.length).to.be.greaterThan(0);
        for (const hit of result.hits.hits) {
          const source = hit._source as any;
          expect(source.policy_base_id).to.eql(agentPolicyId);
        }
      });

      it('should set policy_base_id to the base id on versioned .fleet-policies documents', async () => {
        const versionedId = `${agentPolicyId}#9.3`;

        // Simulate a versioned policy doc as written by version_specific_policies.ts
        await es.index({
          index: AGENT_POLICY_INDEX,
          document: {
            policy_id: versionedId,
            policy_base_id: agentPolicyId,
            revision_idx: 1,
            data: { inputs: [] },
            default_fleet_server: false,
          },
          refresh: 'wait_for',
        });

        const result = await es.search({
          index: AGENT_POLICY_INDEX,
          query: { term: { policy_id: versionedId } },
        });

        expect(result.hits.hits.length).to.eql(1);
        expect((result.hits.hits[0]._source as any).policy_base_id).to.eql(agentPolicyId);
      });
    });

    // ─── agent count queries via policy_base_id ───────────────────────────────

    describe('agent count queries via policy_base_id', () => {
      let agentPolicyId: string;
      const baseAgentId = `test-base-pbi-${Date.now()}`;
      const versionedAgentId = `test-versioned-pbi-${Date.now()}`;

      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();

        const { body } = await supertest
          .post('/api/fleet/agent_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({ name: 'policy_base_id count test', namespace: 'default', force: true })
          .expect(200);
        agentPolicyId = body.item.id;

        // Agent on the base policy_id, with policy_base_id set
        await es.index({
          index: AGENTS_INDEX,
          id: baseAgentId,
          document: {
            active: true,
            policy_id: agentPolicyId,
            policy_base_id: agentPolicyId,
            last_checkin: new Date().toISOString(),
            last_checkin_status: 'online',
            type: 'PERMANENT',
            agent: { version: '9.0.0' },
          },
          refresh: 'wait_for',
        });

        // Agent on a versioned policy_id, but correct policy_base_id
        await es.index({
          index: AGENTS_INDEX,
          id: versionedAgentId,
          document: {
            active: true,
            policy_id: `${agentPolicyId}#9.3`,
            policy_base_id: agentPolicyId,
            last_checkin: new Date().toISOString(),
            last_checkin_status: 'online',
            type: 'PERMANENT',
            agent: { version: '9.3.0' },
          },
          refresh: 'wait_for',
        });
      });

      after(async () => {
        await es.delete({ index: AGENTS_INDEX, id: baseAgentId, refresh: true }).catch(() => {});
        await es
          .delete({ index: AGENTS_INDEX, id: versionedAgentId, refresh: true })
          .catch(() => {});
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
        await esArchiver.unload(
          'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
        );
      });

      it('should count agents on base and versioned policies via policy_base_id when fetching policy', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyId}`)
          .expect(200);
        expect(body.item.agents).to.eql(2);
      });

      it('should count agents via policy_base_id when listing policies with withAgentCount', async () => {
        const { body } = await supertest
          .get('/api/fleet/agent_policies?withAgentCount=true&perPage=100')
          .expect(200);
        const policy = body.items.find((p: any) => p.id === agentPolicyId);
        expect(policy).to.be.ok();
        expect(policy.agents).to.eql(2);
      });
    });

    // ─── fallback for agents without policy_base_id ───────────────────────────

    describe('fallback for agents without policy_base_id (old fleet-server)', () => {
      let agentPolicyId: string;
      const legacyAgentId = `test-legacy-pbi-${Date.now()}`;

      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        await kibanaServer.savedObjects.cleanStandardList();
        await fleetAndAgents.setup();

        const { body } = await supertest
          .post('/api/fleet/agent_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({ name: 'policy_base_id fallback test', namespace: 'default', force: true })
          .expect(200);
        agentPolicyId = body.item.id;

        // Agent enrolled via old fleet-server: has policy_id but no policy_base_id
        await es.index({
          index: AGENTS_INDEX,
          id: legacyAgentId,
          document: {
            active: true,
            policy_id: agentPolicyId,
            // policy_base_id intentionally absent
            last_checkin: new Date().toISOString(),
            last_checkin_status: 'online',
            type: 'PERMANENT',
            agent: { version: '9.0.0' },
          },
          refresh: 'wait_for',
        });
      });

      after(async () => {
        await es.delete({ index: AGENTS_INDEX, id: legacyAgentId, refresh: true }).catch(() => {});
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .expect(200);
        await esArchiver.unload(
          'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
        );
      });

      it('should count agents without policy_base_id via policy_id fallback', async () => {
        const { body } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyId}`)
          .expect(200);
        expect(body.item.agents).to.eql(1);
      });
    });

    // ─── backfill on Fleet setup ───────────────────────────────────────────────

    describe('policy_base_id backfill on Fleet setup', () => {
      const agentId = `test-backfill-pbi-${Date.now()}`;
      const versionedAgentId = `test-backfill-versioned-pbi-${Date.now()}`;
      const hashNonVersionAgentId = `test-backfill-hash-pbi-${Date.now()}`;

      before(async () => {
        await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
        await fleetAndAgents.setup();

        // Insert agents without policy_base_id to simulate old fleet-server enrollment
        await es.index({
          index: AGENTS_INDEX,
          id: agentId,
          document: {
            active: true,
            policy_id: 'backfill-test-policy',
            last_checkin: new Date().toISOString(),
            type: 'PERMANENT',
            agent: { version: '9.0.0' },
          },
          refresh: 'wait_for',
        });

        await es.index({
          index: AGENTS_INDEX,
          id: versionedAgentId,
          document: {
            active: true,
            policy_id: 'backfill-test-policy#9.3',
            last_checkin: new Date().toISOString(),
            type: 'PERMANENT',
            agent: { version: '9.3.0' },
          },
          refresh: 'wait_for',
        });

        // Agent whose policy_id contains '#' but NOT a version suffix (e.g. 'foo#bar').
        // policy_base_id should equal the full policy_id, not just the part before '#'.
        await es.index({
          index: AGENTS_INDEX,
          id: hashNonVersionAgentId,
          document: {
            active: true,
            policy_id: 'backfill-test-policy#notaversion',
            last_checkin: new Date().toISOString(),
            type: 'PERMANENT',
            agent: { version: '9.0.0' },
          },
          refresh: 'wait_for',
        });

        // Trigger Fleet setup to run the self-limiting backfill
        await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'xxxx').expect(200);
      });

      after(async () => {
        await es.delete({ index: AGENTS_INDEX, id: agentId, refresh: true }).catch(() => {});
        await es
          .delete({ index: AGENTS_INDEX, id: versionedAgentId, refresh: true })
          .catch(() => {});
        await es
          .delete({ index: AGENTS_INDEX, id: hashNonVersionAgentId, refresh: true })
          .catch(() => {});
        await esArchiver.unload(
          'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
        );
      });

      it('should populate policy_base_id on agents missing the field after setup', async () => {
        const agent = await es.get({ index: AGENTS_INDEX, id: agentId });
        expect((agent._source as any).policy_base_id).to.eql('backfill-test-policy');
      });

      it('should strip version suffix when populating policy_base_id', async () => {
        const agent = await es.get({ index: AGENTS_INDEX, id: versionedAgentId });
        expect((agent._source as any).policy_base_id).to.eql('backfill-test-policy');
      });

      it('should not strip # segments that are not a version suffix', async () => {
        const agent = await es.get({ index: AGENTS_INDEX, id: hashNonVersionAgentId });
        expect((agent._source as any).policy_base_id).to.eql('backfill-test-policy#notaversion');
      });

      it('should not backfill agents that already have policy_base_id on subsequent setup calls', async () => {
        // Run setup again — self-limiting query should process 0 docs
        await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'xxxx').expect(200);

        // Agents should still have correct policy_base_id (unchanged)
        const agent = await es.get({ index: AGENTS_INDEX, id: agentId });
        expect((agent._source as any).policy_base_id).to.eql('backfill-test-policy');
      });
    });
  });
}
