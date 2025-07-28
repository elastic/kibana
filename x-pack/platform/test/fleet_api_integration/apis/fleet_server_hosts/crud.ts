/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');
  const es = getService('es');

  const getSecretById = (id: string) => {
    return es.get({
      index: '.fleet-secrets',
      id,
    });
  };

  const deleteAllSecrets = async () => {
    try {
      await es.deleteByQuery({
        index: '.fleet-secrets',
        query: {
          match_all: {},
        },
      });
    } catch (err) {
      // index doesn't exist
    }
  };

  const createFleetServerAgent = async (
    agentPolicyId: string,
    hostname: string,
    agentVersion: string
  ) => {
    const agentResponse = await es.index({
      index: '.fleet-agents',
      refresh: true,
      body: {
        access_api_key_id: 'api-key-3',
        active: true,
        policy_id: agentPolicyId,
        type: 'PERMANENT',
        local_metadata: {
          host: { hostname },
          elastic: { agent: { version: agentVersion } },
        },
        user_provided_metadata: {},
        enrolled_at: new Date().toISOString(),
        last_checkin: new Date().toISOString(),
        tags: ['tag1'],
      },
    });

    return agentResponse._id;
  };

  const createFleetServerPolicy = async (id: string) => {
    await kibanaServer.savedObjects.create({
      id: `package-policy-test`,
      type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      overwrite: true,
      attributes: {
        policy_ids: [id],
        name: 'Fleet Server',
        package: {
          name: 'fleet_server',
        },
        latest_revision: true,
      },
    });
  };

  const clearAgents = async () => {
    try {
      await es.deleteByQuery({
        index: '.fleet-agents',
        refresh: true,
        query: {
          match_all: {},
        },
      });
    } catch (err) {
      // index doesn't exist
    }
  };

  describe('fleet_fleet_server_hosts_crud', function () {
    let defaultFleetServerHostId: string;
    let fleetServerPolicyId: string;

    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();

      await kibanaServer.savedObjects.clean({
        types: ['fleet-fleet-server-host'],
      });

      const { body: defaultRes } = await supertest
        .post(`/api/fleet/fleet_server_hosts`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Default',
          is_default: true,
          host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
        })
        .expect(200);
      await supertest
        .post(`/api/fleet/fleet_server_hosts`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test',
          host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
        })
        .expect(200);
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'kibana')
        .send({
          name: 'Fleet Server policy 1',
          namespace: 'default',
          has_fleet_server: true,
        })
        .expect(200);
      const fleetServerPolicy = apiResponse.item;
      fleetServerPolicyId = fleetServerPolicy.id;

      defaultFleetServerHostId = defaultRes.item.id;
      await createFleetServerPolicy(fleetServerPolicyId);

      await deleteAllSecrets();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('GET /fleet_server_hosts', () => {
      it('should list the fleet server hosts', async () => {
        const { body: res } = await supertest.get(`/api/fleet/fleet_server_hosts`).expect(200);

        expect(res.items.length).to.be(2);
      });
    });

    describe('GET /fleet_server_hosts/{itemId}', () => {
      it('should return the requested fleet server host', async () => {
        const { body: fleetServerHost } = await supertest
          .get(`/api/fleet/fleet_server_hosts/${defaultFleetServerHostId}`)
          .expect(200);

        expect(fleetServerHost).to.eql({
          item: {
            id: defaultFleetServerHostId,
            name: 'Default',
            is_default: true,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_preconfigured: false,
          },
        });
      });

      it('should return a 404 when retrieving a non existing fleet server host', async function () {
        await supertest.get(`/api/fleet/fleet_server_hosts/idonotexists`).expect(404);
      });
    });

    describe('POST /fleet_server_hosts', () => {
      it('should allow to create a default fleet server host with id', async function () {
        const id = `test-${Date.now()}`;

        await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_default: true,
            id,
          })
          .expect(200);

        const {
          body: { item: fleetServerHost },
        } = await supertest.get(`/api/fleet/fleet_server_hosts/${id}`).expect(200);

        expect(fleetServerHost.is_default).to.be(true);
      });

      it('should allow to create a default fleet server host with SSL options', async function () {
        const res = await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_default: true,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
              es_certificate: 'path/to/EScert',
              es_certificate_authorities: ['ES cert authorities'],
            },
          })
          .expect(200);

        const {
          body: { item: fleetServerHost },
        } = await supertest.get(`/api/fleet/fleet_server_hosts/${res.body.item.id}`).expect(200);

        expect(fleetServerHost.is_default).to.be(true);
      });

      it('should not unset default fleet server host on id conflict', async function () {
        const id = `test-${Date.now()}`;

        await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_default: true,
            id,
          })
          .expect(200);

        await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_default: true,
            id,
          })
          .expect(409);

        const {
          body: { item: fleetServerHost },
        } = await supertest.get(`/api/fleet/fleet_server_hosts/${id}`).expect(200);

        expect(fleetServerHost.is_default).to.be(true);
      });

      it('should not allow ssl.key and secrets.ssl.key to be set at the same time', async function () {
        const id = `test-${Date.now()}`;

        const res = await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_default: true,
            id,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
              es_certificate: 'path/to/EScert',
              es_certificate_authorities: ['ES cert authorities'],
              key: 'KEY',
            },
            secrets: { ssl: { key: 'KEY' } },
          })
          .expect(400);

        expect(res.body.message).to.equal('Cannot specify both ssl.key and secrets.ssl.key');
      });

      it('should not allow ssl.es_key and secrets.ssl.es_key to be set at the same time', async function () {
        const id = `test-${Date.now()}`;

        const res = await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_default: true,
            id,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
              es_certificate: 'path/to/EScert',
              es_certificate_authorities: ['ES cert authorities'],
              es_key: 'KEY',
            },
            secrets: { ssl: { es_key: 'KEY' } },
          })
          .expect(400);

        expect(res.body.message).to.equal('Cannot specify both ssl.es_key and secrets.ssl.es_key');
      });

      it('should not store secrets if fleet server does not meet minimum version', async function () {
        await clearAgents();
        await createFleetServerAgent(fleetServerPolicyId, 'server_1', '7.0.0');

        const res = await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_default: true,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
              es_certificate: 'path/to/EScert',
              es_certificate_authorities: ['ES cert authorities'],
            },
            secrets: { ssl: { key: 'KEY1', es_key: 'KEY2' } },
          })
          .expect(200);

        expect(Object.keys(res.body.item)).not.to.contain('secrets');
        expect(Object.keys(res.body.item)).to.contain('ssl');
        expect(Object.keys(res.body.item.ssl)).to.contain('key');
        expect(res.body.item.ssl.key).to.equal('KEY1');
      });

      it('should store secrets if fleet server meets minimum version', async function () {
        await clearAgents();
        await createFleetServerAgent(fleetServerPolicyId, 'server_1', '8.12.0');
        const res = await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_default: true,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
              es_certificate: 'path/to/EScert',
              es_certificate_authorities: ['ES cert authorities'],
            },
            secrets: { ssl: { key: 'KEY1', es_key: 'KEY2' } },
          })
          .expect(200);

        expect(Object.keys(res.body.item)).to.contain('secrets');
        const secretId1 = res.body.item.secrets.ssl.key.id;
        const secret1 = await getSecretById(secretId1);
        // @ts-ignore _source unknown type
        expect(secret1._source.value).to.equal('KEY1');

        const secretId2 = res.body.item.secrets.ssl.es_key.id;
        const secret2 = await getSecretById(secretId2);
        // @ts-ignore _source unknown type
        expect(secret2._source.value).to.equal('KEY2');
      });
    });

    describe('PUT /fleet_server_hosts/{itemId}', () => {
      it('should allow to update an existing fleet server host', async function () {
        await supertest
          .put(`/api/fleet/fleet_server_hosts/${defaultFleetServerHostId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Default updated',
          })
          .expect(200);

        const {
          body: { item: fleetServerHost },
        } = await supertest
          .get(`/api/fleet/fleet_server_hosts/${defaultFleetServerHostId}`)
          .expect(200);

        expect(fleetServerHost.name).to.eql('Default updated');
      });

      it('should allow to update an existing fleet server host with SSL options', async function () {
        await supertest
          .put(`/api/fleet/fleet_server_hosts/${defaultFleetServerHostId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Default',
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
              es_certificate: 'path/to/EScert',
              es_certificate_authorities: ['ES cert authorities'],
            },
          })
          .expect(200);

        const {
          body: { item: fleetServerHost },
        } = await supertest
          .get(`/api/fleet/fleet_server_hosts/${defaultFleetServerHostId}`)
          .expect(200);

        expect(fleetServerHost.ssl.certificate).to.eql('path/to/cert');
        expect(fleetServerHost.ssl.certificate_authorities).to.eql(['cert authorities']);
        expect(fleetServerHost.ssl.es_certificate).to.eql('path/to/EScert');
        expect(fleetServerHost.ssl.es_certificate_authorities).to.eql(['ES cert authorities']);
      });

      it('should return a 404 when updating a non existing fleet server host', async function () {
        await supertest
          .put(`/api/fleet/fleet_server_hosts/idonotexists`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'new host1',
          })
          .expect(404);
      });

      it('should allow secrets to be updated + delete unused secret', async function () {
        await createFleetServerAgent(fleetServerPolicyId, 'server_1', '8.12.0');

        const res = await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_default: true,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
              es_certificate: 'path/to/EScert',
              es_certificate_authorities: ['ES cert authorities'],
            },
            secrets: { ssl: { key: 'KEY1', es_key: 'KEY2' } },
          })
          .expect(200);
        const hostId = res.body.item.id;
        const secretId = res.body.item.secrets.ssl.key.id;
        const secret = await getSecretById(secretId);
        // @ts-ignore _source unknown type
        expect(secret._source.value).to.equal('KEY1');

        const updatedRes = await supertest
          .put(`/api/fleet/fleet_server_hosts/${hostId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            is_default: true,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
              es_certificate: 'path/to/EScert',
              es_certificate_authorities: ['ES cert authorities'],
            },
            secrets: { ssl: { key: 'NEW_KEY' } },
          })
          .expect(200);

        const updatedSecretId = updatedRes.body.item.secrets.ssl.key.id;

        expect(updatedSecretId).not.to.equal(secretId);

        const updatedSecret = await getSecretById(updatedSecretId);

        // @ts-ignore _source unknown type
        expect(updatedSecret._source.value).to.equal('NEW_KEY');

        try {
          await getSecretById(secretId);
          expect().fail('Secret should have been deleted');
        } catch (e) {
          // not found
        }
      });
    });

    describe('DELETE /fleet_server_hosts/{itemId}', () => {
      let hostId1: string;
      before(async () => {
        const res = await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Test',
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
          })
          .expect(200);
        hostId1 = res.body.item.id;
      });

      it('should allow to delete an a fleet server host', async function () {
        const { body: deleteResponse } = await supertest
          .delete(`/api/fleet/fleet_server_hosts/${hostId1}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(deleteResponse.id).to.eql(hostId1);
      });

      it('should delete secrets when deleting a fleet server host', async function () {
        await createFleetServerAgent(fleetServerPolicyId, 'server_1', '8.12.0');

        const res = await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080', 'https://test.fr:8081'],
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
              es_certificate: 'path/to/EScert',
              es_certificate_authorities: ['ES cert authorities'],
            },
            secrets: { ssl: { es_key: 'KEY2' } },
          })
          .expect(200);
        const hostWithSecretsId = res.body.item.id;
        const secretId = res.body.item.secrets.ssl.es_key.id;

        await supertest
          .delete(`/api/fleet/fleet_server_hosts/${hostWithSecretsId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        try {
          await getSecretById(secretId);
          expect().fail('Secret should have been deleted');
        } catch (e) {
          // not found
        }
      });
    });
  });
}
