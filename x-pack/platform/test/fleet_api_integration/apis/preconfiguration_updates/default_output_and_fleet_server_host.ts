/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DEFAULT_OUTPUT_ID, ECH_AGENTLESS_OUTPUT_ID } from '@kbn/fleet-plugin/common/constants';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  const PRECONFIGURED_FLEET_SERVER_HOST_ID = 'preconfigured-default-fleet-server';

  describe('fleet_preconfiguration_updates', function () {
    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      // Running Fleet setup triggers the preconfiguration reconciliation that creates the
      // default output and default fleet server host from server config, exactly as happens
      // on a real Kibana boot.
      await fleetAndAgents.setup();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    describe('default output created from xpack.fleet.agents.elasticsearch.hosts', () => {
      it('should be preconfigured', async () => {
        const { body: res } = await supertest
          .get(`/api/fleet/outputs/${DEFAULT_OUTPUT_ID}`)
          .expect(200);

        expect(res.item.is_preconfigured).to.be(true);
      });

      it('should allow updating hosts via the API, mirroring tooling that rewrites the default output to match the real cluster address', async () => {
        const newHosts = ['https://updated-cluster.example.com:9200'];

        const { body: res } = await supertest
          .put(`/api/fleet/outputs/${DEFAULT_OUTPUT_ID}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ hosts: newHosts })
          .expect(200);

        expect(res.item.hosts).to.eql(newHosts);

        const { body: getRes } = await supertest
          .get(`/api/fleet/outputs/${DEFAULT_OUTPUT_ID}`)
          .expect(200);

        expect(getRes.item.hosts).to.eql(newHosts);
      });

      it('should allow updating ca_sha256 and ca_trusted_fingerprint via the API', async () => {
        const { body: res } = await supertest
          .put(`/api/fleet/outputs/${DEFAULT_OUTPUT_ID}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ca_sha256: 'updated-ca-sha-256',
            ca_trusted_fingerprint: 'updated-ca-trusted-fingerprint',
          })
          .expect(200);

        expect(res.item.ca_sha256).to.eql('updated-ca-sha-256');
        expect(res.item.ca_trusted_fingerprint).to.eql('updated-ca-trusted-fingerprint');
      });

      it('should still reject updates to fields not covered by allow_edit', async () => {
        const { body: res } = await supertest
          .put(`/api/fleet/outputs/${DEFAULT_OUTPUT_ID}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ name: 'renamed default output' })
          .expect(400);

        expect(res.message).to.contain('cannot be updated outside of kibana config file');
      });
    });

    describe('ECH agentless output created when agentless is enabled on cloud', () => {
      it('should be preconfigured', async () => {
        const { body: res } = await supertest
          .get(`/api/fleet/outputs/${ECH_AGENTLESS_OUTPUT_ID}`)
          .expect(200);

        expect(res.item.is_preconfigured).to.be(true);
      });

      it('should allow updating hosts via the API, mirroring a cluster address rotation', async () => {
        const newHosts = ['https://updated-agentless-cluster.example.com:9200'];

        const { body: res } = await supertest
          .put(`/api/fleet/outputs/${ECH_AGENTLESS_OUTPUT_ID}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ hosts: newHosts })
          .expect(200);

        expect(res.item.hosts).to.eql(newHosts);
      });

      it('should allow updating ca_sha256 via the API', async () => {
        const { body: res } = await supertest
          .put(`/api/fleet/outputs/${ECH_AGENTLESS_OUTPUT_ID}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ ca_sha256: 'updated-agentless-ca-sha-256' })
          .expect(200);

        expect(res.item.ca_sha256).to.eql('updated-agentless-ca-sha-256');
      });

      it('should still reject updates to fields not covered by allow_edit', async () => {
        const { body: res } = await supertest
          .put(`/api/fleet/outputs/${ECH_AGENTLESS_OUTPUT_ID}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ name: 'renamed agentless output' })
          .expect(400);

        expect(res.message).to.contain('cannot be updated outside of kibana config file');
      });
    });

    describe('default fleet server host created from xpack.fleet.fleetServerHosts', () => {
      it('should be preconfigured and default', async () => {
        const { body: res } = await supertest
          .get(`/api/fleet/fleet_server_hosts/${PRECONFIGURED_FLEET_SERVER_HOST_ID}`)
          .expect(200);

        expect(res.item.is_preconfigured).to.be(true);
        expect(res.item.is_default).to.be(true);
      });

      it('should allow setting a new default fleet server host via the API, un-defaulting the preconfigured one as a system side effect', async () => {
        const { body: createRes } = await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'New default from API',
            is_default: true,
            host_urls: ['https://new-default.fleet.example.com:8220'],
          })
          .expect(200);

        expect(createRes.item.is_default).to.be(true);

        const { body: previousDefaultRes } = await supertest
          .get(`/api/fleet/fleet_server_hosts/${PRECONFIGURED_FLEET_SERVER_HOST_ID}`)
          .expect(200);

        expect(previousDefaultRes.item.is_default).to.be(false);
        // The preconfigured host itself remains preconfigured; only its is_default flag
        // was flipped as a system-level side effect, not a direct user edit of a locked field.
        expect(previousDefaultRes.item.is_preconfigured).to.be(true);
      });
    });
  });
}
