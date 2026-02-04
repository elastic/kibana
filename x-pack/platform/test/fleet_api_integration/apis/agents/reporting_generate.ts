/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { testUsers } from '../test_users';

const reportUrlPattern = /\/api\/reporting\/jobs\/download\/.+/;

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('fleet_agents_reporting_generate', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await fleetAndAgents.setup();
    });
    beforeEach(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/agents');
      await getService('supertest').post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').send();
    });
    afterEach(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/agents');
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    it('should respond 403 if user lacks fleet agent read permissions', async () => {
      await supertestWithoutAuth
        .post(`/internal/fleet/agents/reporting/generate?apiVersion=1`)
        .set('kbn-xsrf', 'xxx')
        .auth(testUsers.fleet_agents_read_only.username, testUsers.fleet_agents_read_only.password)
        .send({
          agents: ['agent1', 'agent2'],
          fields: ['agent.id', 'status', 'policy_id'],
          timezone: 'UTC',
        })
        .expect(403);
    });

    it('should respond 403 if user lacks fleet generate_report permission', async () => {
      await supertestWithoutAuth
        .post(`/internal/fleet/agents/reporting/generate?apiVersion=1`)
        .set('kbn-xsrf', 'xxx')
        .auth(
          testUsers.fleet_generate_report_only.username,
          testUsers.fleet_generate_report_only.password
        )
        .send({
          agents: ['agent1', 'agent2'],
          fields: ['agent.id', 'status', 'policy_id'],
          timezone: 'UTC',
        })
        .expect(403);
    });

    it('should successfully generate a report when provided agent ids', async () => {
      const response = await supertestWithoutAuth
        .post(`/internal/fleet/agents/reporting/generate?apiVersion=1`)
        .set('kbn-xsrf', 'xxx')
        .auth(
          testUsers.fleet_generate_report_agents_read_only.username,
          testUsers.fleet_generate_report_agents_read_only.password
        )
        .send({
          agents: ['agent1', 'agent2'],
          fields: ['agent.id', 'status', 'policy_id'],
          timezone: 'UTC',
        })
        .expect(200);

      expect(response.body.url).match(reportUrlPattern);
    });

    it('should work for multiple agents by kuery', async () => {
      const response = await supertestWithoutAuth
        .post(`/internal/fleet/agents/reporting/generate?apiVersion=1`)
        .set('kbn-xsrf', 'xxx')
        .auth(
          testUsers.fleet_generate_report_agents_read_only.username,
          testUsers.fleet_generate_report_agents_read_only.password
        )
        .send({
          agents: 'status:online',
          fields: ['agent.id', 'status', 'policy_id'],
          timezone: 'UTC',
        })
        .expect(200);

      expect(response.body.url).match(reportUrlPattern);
    });
  });
}
