/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

const OPAMP_AGENT_1 = 'opamp-collector-1';
const OPAMP_AGENT_2 = 'opamp-collector-2';

async function createOpampCollector(esClient: any, id: string) {
  await esClient.create({
    id,
    refresh: 'wait_for',
    index: AGENTS_INDEX,
    document: {
      active: true,
      type: 'OPAMP',
      policy_id: 'policy1',
      local_metadata: { host: { hostname: id } },
      user_provided_metadata: {},
      enrolled_at: new Date().toISOString(),
      last_checkin: new Date().toISOString(),
      last_checkin_status: 'disconnected',
    },
  });
}

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const esClient = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('fleet_remove_collector', () => {
    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await fleetAndAgents.setup();
    });

    beforeEach(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/agents');
      await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').send();
      await createOpampCollector(esClient, OPAMP_AGENT_1);
      await createOpampCollector(esClient, OPAMP_AGENT_2);
    });

    afterEach(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/agents');
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    describe('POST /agents/{agentId}/remove_collector', () => {
      it('marks an OpAMP collector as unenrolled without invalidating API keys', async () => {
        await supertest
          .post(`/api/fleet/agents/${OPAMP_AGENT_1}/remove_collector`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const { body } = await supertest.get(`/api/fleet/agents/${OPAMP_AGENT_1}`).expect(200);
        expect(body.item.active).to.eql(false);
        expect(typeof body.item.unenrolled_at).to.eql('string');
      });

      it('does not write a .fleet-actions document for the collector', async () => {
        await supertest
          .post(`/api/fleet/agents/${OPAMP_AGENT_1}/remove_collector`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const res = await esClient.search({
          index: '.fleet-actions',
          query: {
            bool: {
              must: [{ term: { agents: OPAMP_AGENT_1 } }, { term: { type: 'UNENROLL' } }],
            },
          },
        });
        const total =
          typeof res.hits.total === 'number' ? res.hits.total : res.hits.total?.value ?? 0;
        expect(total).to.eql(0);
      });

      it('rejects a non-OpAMP agent with 400', async () => {
        // agent1 is a PERMANENT Elastic Agent from the test archive
        await supertest
          .post(`/api/fleet/agents/agent1/remove_collector`)
          .set('kbn-xsrf', 'xxx')
          .expect(400);

        const { body } = await supertest.get(`/api/fleet/agents/agent1`).expect(200);
        expect(body.item.active).to.eql(true);
      });

      it('returns 404 for an unknown agent id', async () => {
        await supertest
          .post(`/api/fleet/agents/does-not-exist/remove_collector`)
          .set('kbn-xsrf', 'xxx')
          .expect(404);
      });
    });

    describe('POST /agents/bulk_remove_collectors', () => {
      it('removes multiple OpAMP collectors by id', async () => {
        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_remove_collectors`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: [OPAMP_AGENT_1, OPAMP_AGENT_2] })
          .expect(200);

        expect(typeof body.actionId).to.eql('string');

        const [r1, r2] = await Promise.all([
          supertest.get(`/api/fleet/agents/${OPAMP_AGENT_1}`),
          supertest.get(`/api/fleet/agents/${OPAMP_AGENT_2}`),
        ]);
        expect(r1.body.item.active).to.eql(false);
        expect(typeof r1.body.item.unenrolled_at).to.eql('string');
        expect(r2.body.item.active).to.eql(false);
        expect(typeof r2.body.item.unenrolled_at).to.eql('string');
      });

      it('removes only OpAMP collectors when the selection mixes types', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_remove_collectors`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: [OPAMP_AGENT_1, 'agent1'] })
          .expect(200);

        const [opamp, fleetAgent] = await Promise.all([
          supertest.get(`/api/fleet/agents/${OPAMP_AGENT_1}`),
          supertest.get(`/api/fleet/agents/agent1`),
        ]);
        expect(opamp.body.item.active).to.eql(false);
        expect(fleetAgent.body.item.active).to.eql(true);
      });

      it('supports kuery-based selection for OpAMP collectors', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_remove_collectors`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: 'type:OPAMP' })
          .expect(200);

        const [r1, r2] = await Promise.all([
          supertest.get(`/api/fleet/agents/${OPAMP_AGENT_1}`),
          supertest.get(`/api/fleet/agents/${OPAMP_AGENT_2}`),
        ]);
        expect(r1.body.item.active).to.eql(false);
        expect(r2.body.item.active).to.eql(false);
      });

      it('does not write .fleet-actions documents for removed collectors', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_remove_collectors`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: [OPAMP_AGENT_1, OPAMP_AGENT_2] })
          .expect(200);

        const res = await esClient.search({
          index: '.fleet-actions',
          query: {
            bool: {
              must: [
                { terms: { agents: [OPAMP_AGENT_1, OPAMP_AGENT_2] } },
                { term: { type: 'UNENROLL' } },
              ],
            },
          },
        });
        const total =
          typeof res.hits.total === 'number' ? res.hits.total : res.hits.total?.value ?? 0;
        expect(total).to.eql(0);
      });
    });
  });
}
