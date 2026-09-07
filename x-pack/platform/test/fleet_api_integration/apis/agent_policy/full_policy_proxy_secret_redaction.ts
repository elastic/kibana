/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupTestUsers, testUsers } from '../test_users';

/**
 * Verifies that proxy_headers (bearer tokens) and ssl.key (TLS private keys) are
 * redacted from GET /api/fleet/agent_policies/{id}/full and its /download variant
 * for callers that hold only fleet-agent-policies-read, while remaining visible to
 * callers that also have fleet-settings-read.

 */
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('GET /api/fleet/agent_policies/{id}/full — proxy secret redaction by privilege', () => {
    const PROXY_ID = 'proxy-secret-redaction-test';
    let agentPolicyId: string;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await setupTestUsers(getService('security'));
      await fleetAndAgents.setup();

      // Create a proxy with bearer-token proxy_headers and a TLS private key
      await supertest
        .post('/api/fleet/proxies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: PROXY_ID,
          name: 'Proxy secret redaction test proxy',
          url: 'https://proxy.test.internal:8443',
          proxy_headers: { Authorization: 'Bearer SUPER_SECRET_TOKEN' },
          certificate_key:
            '-----BEGIN PRIVATE KEY-----PRIVATE_KEY_MATERIAL-----END PRIVATE KEY-----',
        })
        .expect(200);

      // Create an output that references the proxy
      const { body: outputRes } = await supertest
        .post('/api/fleet/outputs')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Output with proxy (secret redaction test)',
          type: 'elasticsearch',
          hosts: ['https://es.test.internal:9200'],
          proxy_id: PROXY_ID,
        })
        .expect(200);

      // Create an agent policy that uses the proxied output
      const { body: policyRes } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `Proxy secret redaction test policy ${Date.now()}`,
          namespace: 'default',
          data_output_id: outputRes.item.id,
          monitoring_output_id: outputRes.item.id,
        })
        .expect(200);

      agentPolicyId = policyRes.item.id;
    });

    after(async () => {
      await supertest
        .post('/api/fleet/agent_policies/delete')
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId })
        .expect(200);
      await supertest.delete(`/api/fleet/proxies/${PROXY_ID}`).set('kbn-xsrf', 'xxxx').expect(200);
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('fleet_agent_policies_read_only user (no settings-read)', () => {
      it('should NOT expose proxy_headers or ssl.key in the full policy response', async () => {
        const { body } = await supertestWithoutAuth
          .get(`/api/fleet/agent_policies/${agentPolicyId}/full`)
          .set('kbn-xsrf', 'xxxx')
          .auth(
            testUsers.fleet_agent_policies_read_only.username,
            testUsers.fleet_agent_policies_read_only.password
          )
          .expect(200);

        const outputs = body.item.outputs as Record<string, any>;
        for (const output of Object.values(outputs)) {
          expect(output).not.to.have.property('proxy_headers');
          if (output.ssl) {
            expect(output.ssl).not.to.have.property('key');
          }
          // proxy_url is non-secret and must still be present
          if (output.proxy_url) {
            expect(output.proxy_url).to.be.a('string');
          }
        }
      });

      it('should NOT expose proxy_headers or ssl.key in the download YAML', async () => {
        const { text } = await supertestWithoutAuth
          .get(`/api/fleet/agent_policies/${agentPolicyId}/download`)
          .set('kbn-xsrf', 'xxxx')
          .auth(
            testUsers.fleet_agent_policies_read_only.username,
            testUsers.fleet_agent_policies_read_only.password
          )
          .expect(200);

        expect(text).not.to.contain('SUPER_SECRET_TOKEN');
        expect(text).not.to.contain('PRIVATE_KEY_MATERIAL');
        // proxy_url must still appear
        expect(text).to.contain('proxy.test.internal');
      });
    });

    describe('fleet_all_only user (has settings-read)', () => {
      it('should expose proxy_headers and ssl.key in the full policy response', async () => {
        const { body } = await supertestWithoutAuth
          .get(`/api/fleet/agent_policies/${agentPolicyId}/full`)
          .set('kbn-xsrf', 'xxxx')
          .auth(testUsers.fleet_all_only.username, testUsers.fleet_all_only.password)
          .expect(200);

        const outputs = body.item.outputs as Record<string, any>;
        const proxiedOutput = Object.values(outputs).find((o: any) => o.proxy_url);
        expect(proxiedOutput).to.be.ok();
        expect(proxiedOutput.proxy_headers).to.eql({ Authorization: 'Bearer SUPER_SECRET_TOKEN' });
        expect(proxiedOutput.ssl?.key).to.eql(
          '-----BEGIN PRIVATE KEY-----PRIVATE_KEY_MATERIAL-----END PRIVATE KEY-----'
        );
      });

      it('should expose proxy_headers and ssl.key in the download YAML', async () => {
        const { text } = await supertestWithoutAuth
          .get(`/api/fleet/agent_policies/${agentPolicyId}/download`)
          .set('kbn-xsrf', 'xxxx')
          .auth(testUsers.fleet_all_only.username, testUsers.fleet_all_only.password)
          .expect(200);

        expect(text).to.contain('SUPER_SECRET_TOKEN');
        expect(text).to.contain('PRIVATE_KEY_MATERIAL');
      });
    });
  });
}
