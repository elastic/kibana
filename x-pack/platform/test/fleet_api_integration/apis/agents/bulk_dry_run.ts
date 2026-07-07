/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const es = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('fleet_bulk_agent_dry_run', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
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

    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    async function getActionCount(): Promise<number> {
      const res = await es.count({ index: AGENT_ACTIONS_INDEX });
      return res.count;
    }

    describe('bulk_unenroll', () => {
      it('returns { count } by agent ids without creating actions', async () => {
        const actionsBefore = await getActionCount();

        const { body } = await supertest
          .post('/api/fleet/agents/bulk_unenroll')
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['agent1', 'agent2'], dryRun: true })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');

        const actionsAfter = await getActionCount();
        expect(actionsAfter).to.eql(actionsBefore);

        const { body: agent1Body } = await supertest.get('/api/fleet/agents/agent1');
        expect(agent1Body.item.unenrollment_started_at).to.be(undefined);
        expect(agent1Body.item.active).to.eql(true);
      });

      it('returns { count } by kuery without creating actions', async () => {
        const actionsBefore = await getActionCount();

        const { body } = await supertest
          .post('/api/fleet/agents/bulk_unenroll')
          .set('kbn-xsrf', 'xxx')
          .send({ agents: 'active:true', dryRun: true })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');
        expect(body.count).to.be.greaterThan(0);

        const actionsAfter = await getActionCount();
        expect(actionsAfter).to.eql(actionsBefore);
      });
    });

    describe('bulk_reassign', () => {
      it('returns { count } by agent ids without creating actions', async () => {
        const actionsBefore = await getActionCount();

        const { body } = await supertest
          .post('/api/fleet/agents/bulk_reassign')
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['agent1', 'agent2'], policy_id: 'policy2', dryRun: true })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');

        const actionsAfter = await getActionCount();
        expect(actionsAfter).to.eql(actionsBefore);

        const { body: agent1Body } = await supertest.get('/api/fleet/agents/agent1');
        expect(agent1Body.item.policy_id).to.eql('policy1');
      });

      it('returns { count } by kuery without creating actions', async () => {
        const actionsBefore = await getActionCount();

        const { body } = await supertest
          .post('/api/fleet/agents/bulk_reassign')
          .set('kbn-xsrf', 'xxx')
          .send({ agents: 'active:true', policy_id: 'policy2', dryRun: true })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');
        expect(body.count).to.be.greaterThan(0);

        const actionsAfter = await getActionCount();
        expect(actionsAfter).to.eql(actionsBefore);
      });
    });

    describe('bulk_upgrade', () => {
      it('returns { count } by agent ids without creating actions', async () => {
        const actionsBefore = await getActionCount();

        const { body } = await supertest
          .post('/api/fleet/agents/bulk_upgrade')
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['agent1', 'agent2'], version: '8.5.0', dryRun: true })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');

        const actionsAfter = await getActionCount();
        expect(actionsAfter).to.eql(actionsBefore);
      });

      it('returns { count } by kuery without creating actions', async () => {
        const actionsBefore = await getActionCount();

        const { body } = await supertest
          .post('/api/fleet/agents/bulk_upgrade')
          .set('kbn-xsrf', 'xxx')
          .send({ agents: 'active:true', version: '8.5.0', dryRun: true })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');
        expect(body.count).to.be.greaterThan(0);

        const actionsAfter = await getActionCount();
        expect(actionsAfter).to.eql(actionsBefore);
      });
    });

    describe('bulk_request_diagnostics', () => {
      it('returns { count } by agent ids without creating actions', async () => {
        const actionsBefore = await getActionCount();

        const { body } = await supertest
          .post('/api/fleet/agents/bulk_request_diagnostics')
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['agent1', 'agent2'], dryRun: true })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');

        const actionsAfter = await getActionCount();
        expect(actionsAfter).to.eql(actionsBefore);
      });

      it('returns { count } by kuery without creating actions', async () => {
        const actionsBefore = await getActionCount();

        const { body } = await supertest
          .post('/api/fleet/agents/bulk_request_diagnostics')
          .set('kbn-xsrf', 'xxx')
          .send({ agents: 'active:true', dryRun: true })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');
        expect(body.count).to.be.greaterThan(0);

        const actionsAfter = await getActionCount();
        expect(actionsAfter).to.eql(actionsBefore);
      });
    });

    describe('bulk_update_agent_tags', () => {
      it('returns { count } by agent ids without modifying agents', async () => {
        const { body: agent1Before } = await supertest.get('/api/fleet/agents/agent1');
        const tagsBefore = agent1Before.item.tags ?? [];

        const { body } = await supertest
          .post('/api/fleet/agents/bulk_update_agent_tags')
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['agent1', 'agent2'], tagsToAdd: ['dry-run-tag'], dryRun: true })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');

        const { body: agent1After } = await supertest.get('/api/fleet/agents/agent1');
        expect(agent1After.item.tags ?? []).to.eql(tagsBefore);
      });

      it('returns { count } by kuery without modifying agents', async () => {
        const { body } = await supertest
          .post('/api/fleet/agents/bulk_update_agent_tags')
          .set('kbn-xsrf', 'xxx')
          .send({ agents: 'active:true', tagsToAdd: ['dry-run-tag'], dryRun: true })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');
        expect(body.count).to.be.greaterThan(0);
      });
    });

    describe('bulk_rollback', () => {
      it('returns { count } by kuery without creating actions', async () => {
        const actionsBefore = await getActionCount();

        const { body } = await supertest
          .post('/api/fleet/agents/bulk_rollback')
          .set('kbn-xsrf', 'xxx')
          .send({ agents: 'active:true', dryRun: true })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');

        const actionsAfter = await getActionCount();
        expect(actionsAfter).to.eql(actionsBefore);
      });
    });

    describe('bulk_migrate', () => {
      it('returns { count } by agent ids without creating actions', async () => {
        const actionsBefore = await getActionCount();

        const { body } = await supertest
          .post('/api/fleet/agents/bulk_migrate')
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent1', 'agent2'],
            uri: 'https://example.com',
            enrollment_token: 'test-token',
            dryRun: true,
          })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');

        const actionsAfter = await getActionCount();
        expect(actionsAfter).to.eql(actionsBefore);
      });

      it('returns { count } by kuery without creating actions', async () => {
        const actionsBefore = await getActionCount();

        const { body } = await supertest
          .post('/api/fleet/agents/bulk_migrate')
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active:true',
            uri: 'https://example.com',
            enrollment_token: 'test-token',
            dryRun: true,
          })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');

        const actionsAfter = await getActionCount();
        expect(actionsAfter).to.eql(actionsBefore);
      });
    });

    describe('bulk_privilege_level_change', () => {
      it('returns { count } by agent ids without creating actions', async () => {
        const actionsBefore = await getActionCount();

        const { body } = await supertest
          .post('/api/fleet/agents/bulk_privilege_level_change')
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent1', 'agent2'],
            user_info: { username: 'user1', groupname: 'group1', password: 'password' },
            dryRun: true,
          })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');

        const actionsAfter = await getActionCount();
        expect(actionsAfter).to.eql(actionsBefore);
      });

      it('returns { count } by kuery without creating actions', async () => {
        const actionsBefore = await getActionCount();

        const { body } = await supertest
          .post('/api/fleet/agents/bulk_privilege_level_change')
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active:true',
            user_info: { username: 'user1', groupname: 'group1', password: 'password' },
            dryRun: true,
          })
          .expect(200);

        expect(body).to.have.property('count');
        expect(body.count).to.be.a('number');

        const actionsAfter = await getActionCount();
        expect(actionsAfter).to.eql(actionsBefore);
      });
    });
  });
}
