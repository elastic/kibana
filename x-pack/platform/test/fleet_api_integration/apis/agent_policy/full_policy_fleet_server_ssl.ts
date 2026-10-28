/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

/**
 * Verifies how the SSL settings of a fleet server host are compiled into the full agent policy of a
 * Fleet Server policy: the `fleetserver-output-*` output must keep the hosts of the policy output and
 * must only be used by the fleet-server input when an ES SSL setting is set on the fleet server host.
 */
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('GET /api/fleet/agent_policies/{id}/full — fleet server host ssl', () => {
    skipIfNoDockerRegistry(providerContext);

    const OUTPUT_ID = 'fleet-server-ssl-test-output';
    const OUTPUT_HOSTS = ['https://es.test.internal:9200'];
    const ES_SSL_HOST_ID = 'fleet-server-ssl-test-es-ssl-host';
    const AGENT_SSL_HOST_ID = 'fleet-server-ssl-test-agent-ssl-host';
    const ES_SSL_POLICY_ID = 'fleet-server-ssl-test-es-ssl-policy';
    const AGENT_SSL_POLICY_ID = 'fleet-server-ssl-test-agent-ssl-policy';

    const createFleetServerHost = (body: Record<string, unknown>) =>
      supertest
        .post('/api/fleet/fleet_server_hosts')
        .set('kbn-xsrf', 'xxxx')
        .send({ is_default: false, ...body })
        .expect(200);

    const createFleetServerPolicy = (id: string, fleetServerHostId: string) =>
      supertest
        .post('/api/fleet/agent_policies?sys_monitoring=false')
        .set('kbn-xsrf', 'xxxx')
        .send({
          id,
          name: id,
          namespace: 'default',
          has_fleet_server: true,
          fleet_server_host_id: fleetServerHostId,
          data_output_id: OUTPUT_ID,
          monitoring_output_id: OUTPUT_ID,
        })
        .expect(200);

    const getFullPolicy = async (policyId: string) => {
      const { body } = await supertest
        .get(`/api/fleet/agent_policies/${policyId}/full`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      return body.item;
    };

    const getFleetServerInput = (fullPolicy: any) =>
      fullPolicy.inputs.find((input: any) => input.type === 'fleet-server');

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();

      await supertest
        .post('/api/fleet/outputs')
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: OUTPUT_ID,
          name: 'Fleet Server SSL test output',
          type: 'elasticsearch',
          hosts: OUTPUT_HOSTS,
        })
        .expect(200);

      await createFleetServerHost({
        id: ES_SSL_HOST_ID,
        name: 'Fleet Server host with ES SSL',
        host_urls: ['https://fleetserver.test.internal:8220'],
        ssl: {
          es_certificate_authorities: ['/tmp/ssl/es-ca.crt'],
          es_certificate: '/tmp/ssl/es.crt',
          es_key: 'my-es-key',
        },
      });
      await createFleetServerHost({
        id: AGENT_SSL_HOST_ID,
        name: 'Fleet Server host with agent SSL only',
        host_urls: ['https://fleetserver.test.internal:8221'],
        ssl: {
          agent_certificate_authorities: ['/tmp/ssl/agent-ca.crt'],
          agent_certificate: '/tmp/ssl/agent.crt',
          agent_key: 'my-agent-key',
        },
      });

      await createFleetServerPolicy(ES_SSL_POLICY_ID, ES_SSL_HOST_ID);
      await createFleetServerPolicy(AGENT_SSL_POLICY_ID, AGENT_SSL_HOST_ID);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should keep the hosts of the policy output in the bootstrap output and use it in the fleet-server input when the host has es ssl options', async () => {
      const fullPolicy = await getFullPolicy(ES_SSL_POLICY_ID);
      const bootstrapOutputId = `fleetserver-output-${ES_SSL_HOST_ID}`;

      expect(fullPolicy.outputs[bootstrapOutputId]).to.eql({
        ...fullPolicy.outputs[OUTPUT_ID],
        type: 'elasticsearch',
        hosts: OUTPUT_HOSTS,
        ssl: {
          certificate_authorities: ['/tmp/ssl/es-ca.crt'],
          certificate: '/tmp/ssl/es.crt',
          key: 'my-es-key',
        },
      });
      expect(getFleetServerInput(fullPolicy).use_output).to.eql(bootstrapOutputId);
    });

    it('should not generate a bootstrap output when the host has no es ssl options', async () => {
      const fullPolicy = await getFullPolicy(AGENT_SSL_POLICY_ID);

      expect(
        Object.keys(fullPolicy.outputs).filter((id) => id.startsWith('fleetserver-output-'))
      ).to.be.empty();
      expect(getFleetServerInput(fullPolicy).use_output).to.eql(OUTPUT_ID);
      // the agent ssl options are still sent to the agents
      expect(fullPolicy.fleet.ssl).to.eql({
        certificate_authorities: ['/tmp/ssl/agent-ca.crt'],
        certificate: '/tmp/ssl/agent.crt',
        key: 'my-agent-key',
      });
    });
  });
}
