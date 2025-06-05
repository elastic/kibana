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
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');
  const es = getService('es');

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
      },
    });
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

  describe('fleet_download_sources_crud', function () {
    let defaultDownloadSourceId: string;
    let fleetServerPolicyId: string;
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
      await fleetAndAgents.setup();

      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'kibana')
        .send({
          name: 'Default Fleet Server policy',
          namespace: 'default',
          has_fleet_server: true,
          is_default: true,
        })
        .expect(200);
      const fleetServerPolicy = apiResponse.item;
      fleetServerPolicyId = fleetServerPolicy.id;
      await createFleetServerPolicy(fleetServerPolicyId);

      const { body: response } = await supertest
        .get(`/api/fleet/agent_download_sources`)
        .expect(200);

      const defaultDownloadSource = response.items.find((item: any) => item.is_default);
      if (!defaultDownloadSource) {
        throw new Error('default download source not set');
      }
      defaultDownloadSourceId = defaultDownloadSource.id;
      await deleteAllSecrets();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    describe('GET /agent_download_sources', () => {
      it('should list the default download source host', async () => {
        const { body: downloadSource } = await supertest
          .get(`/api/fleet/agent_download_sources`)
          .expect(200);

        expect(downloadSource.items[0]).to.eql({
          id: 'fleet-default-download-source',
          name: 'Elastic Artifacts',
          is_default: true,
          host: 'https://artifacts.elastic.co/downloads/',
        });
      });

      it('should return a 200 if a user with the fleet all try to access the list', async () => {
        await supertestWithoutAuth
          .get(`/api/fleet/agent_download_sources`)
          .auth(testUsers.fleet_all_only.username, testUsers.fleet_all_only.password)
          .expect(200);
      });

      it('should return a 200 if a user with the fleet read try to access the list', async () => {
        await supertestWithoutAuth
          .get(`/api/fleet/agent_download_sources`)
          .auth(testUsers.fleet_read_only.username, testUsers.fleet_read_only.password)
          .expect(200);
      });

      it('should return a 200 if a user with the fleet settings read try to access the list', async () => {
        await supertestWithoutAuth
          .get(`/api/fleet/agent_download_sources`)
          .auth(
            testUsers.fleet_settings_read_only.username,
            testUsers.fleet_settings_read_only.password
          )
          .expect(200);
      });

      it('should return a 403 if a user without the fleet settings read try to access the list', async () => {
        await supertestWithoutAuth
          .get(`/api/fleet/agent_download_sources`)
          .auth(
            testUsers.fleet_minimal_all_only.username,
            testUsers.fleet_minimal_all_only.password
          )
          .expect(403);
      });
    });

    describe('GET /agent_download_sources/{sourceId}', () => {
      it('should return the requested download source host', async () => {
        const { body: downloadSource } = await supertest
          .get(`/api/fleet/agent_download_sources/${defaultDownloadSourceId}`)
          .expect(200);

        expect(downloadSource).to.eql({
          item: {
            id: 'fleet-default-download-source',
            name: 'Elastic Artifacts',
            is_default: true,
            host: 'https://artifacts.elastic.co/downloads/',
          },
        });
      });
    });

    describe('POST /agent_download_sources', () => {
      it('should allow to create a new download source host', async function () {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'My download source',
            host: 'http://test.fr:443',
            is_default: false,
          })
          .expect(200);

        const { id: _, ...itemWithoutId } = postResponse.item;
        expect(itemWithoutId).to.eql({
          name: 'My download source',
          host: 'http://test.fr:443',
          is_default: false,
        });
      });

      it('should toggle default download source when creating a new default one', async function () {
        await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'default download source host 1',
            host: 'https://test.co',
            is_default: true,
          })
          .expect(200);

        const {
          body: { item: downloadSource2 },
        } = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'default download source host 2',
            host: 'https://test2.co',
            is_default: true,
          })
          .expect(200);

        const {
          body: { items: downloadSources },
        } = await supertest.get(`/api/fleet/agent_download_sources`).expect(200);

        const defaultDownloadSource = downloadSources.filter((item: any) => item.is_default);
        expect(defaultDownloadSource).to.have.length(1);
        expect(defaultDownloadSource[0].id).eql(downloadSource2.id);
      });

      it('should return a 400 when passing a host that is not a valid uri', async function () {
        await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'new host1',
            host: 'not a valid uri',
            is_default: true,
          })
          .expect(400);
      });

      it('should allow to create a new download source host with ssl fields', async function () {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'My download source with ssl',
            host: 'http://test.fr:443',
            is_default: false,
            ssl: {
              certificate: 'cert',
              certificate_authorities: ['ca'],
              key: 'KEY1',
            },
          })
          .expect(200);

        const { id: _, ...itemWithoutId } = postResponse.item;
        expect(itemWithoutId).to.eql({
          name: 'My download source with ssl',
          host: 'http://test.fr:443',
          is_default: false,
          ssl: {
            certificate: 'cert',
            certificate_authorities: ['ca'],
            key: 'KEY1',
          },
        });
      });

      it('should not allow ssl.key and secrets.ssl.key to be set at the same time', async function () {
        const res = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `My download source  ${Date.now()}`,
            host: 'http://test.fr:443',
            is_default: false,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
              key: 'KEY',
            },
            secrets: { ssl: { key: 'KEY' } },
          })
          .expect(400);

        expect(res.body.message).to.equal('Cannot specify both ssl.key and secrets.ssl.key');
      });

      it('should not store secrets if fleet server does not meet minimum version', async function () {
        await clearAgents();
        await createFleetServerAgent(fleetServerPolicyId, 'server_1', '7.0.0');

        const { body: res } = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `My download source ${Date.now()}`,
            host: 'http://test.fr:443',
            is_default: false,
            secrets: {
              ssl: {
                key: 'KEY1',
              },
            },
          })
          .expect(200);
        expect(Object.keys(res.item)).not.to.contain('secrets');
        expect(Object.keys(res.item)).to.contain('ssl');
        expect(Object.keys(res.item.ssl)).to.contain('key');
        expect(res.item.ssl.key).to.equal('KEY1');
      });

      it('should store secrets if fleet server meets minimum version', async function () {
        await clearAgents();
        await createFleetServerAgent(fleetServerPolicyId, 'server_1', '8.12.0');
        const res = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `My download source ${Date.now()}`,
            host: 'http://test.fr:443',
            is_default: false,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
            },
            secrets: { ssl: { key: 'KEY1' } },
          })
          .expect(200);

        expect(Object.keys(res.body.item)).to.contain('secrets');
        const secretId1 = res.body.item.secrets.ssl.key.id;
        const secret1 = await getSecretById(secretId1);
        // @ts-ignore _source unknown type
        expect(secret1._source.value).to.equal('KEY1');
      });
    });

    describe('PUT /agent_download_sources/{sourceId}', () => {
      it('should allow to update an existing download source', async function () {
        await supertest
          .put(`/api/fleet/agent_download_sources/${defaultDownloadSourceId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'new host1',
            host: 'https://test.co:403',
            is_default: false,
          })
          .expect(200);

        const {
          body: { item: downloadSource },
        } = await supertest
          .get(`/api/fleet/agent_download_sources/${defaultDownloadSourceId}`)
          .expect(200);

        expect(downloadSource.host).to.eql('https://test.co:403');
      });

      it('should allow to update is_default for existing download source', async function () {
        await supertest
          .put(`/api/fleet/agent_download_sources/${defaultDownloadSourceId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'new default host',
            host: 'https://test.co',
            is_default: true,
          })
          .expect(200);

        await supertest.get(`/api/fleet/agent_download_sources`).expect(200);
      });

      it('should store secrets if fleet server meets minimum version', async function () {
        await clearAgents();
        await createFleetServerAgent(fleetServerPolicyId, 'server_1', '8.12.0');
        const res = await supertest
          .put(`/api/fleet/agent_download_sources/${defaultDownloadSourceId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'new default host',
            host: 'https://test.co',
            is_default: true,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
            },
            secrets: { ssl: { key: 'KEY1' } },
          })
          .expect(200);

        expect(Object.keys(res.body.item)).to.contain('secrets');
        const secretId1 = res.body.item.secrets.ssl.key.id;
        const secret1 = await getSecretById(secretId1);
        // @ts-ignore _source unknown type
        expect(secret1._source.value).to.equal('KEY1');
      });

      it('should allow secrets to be updated + delete unused secret', async function () {
        await clearAgents();
        await createFleetServerAgent(fleetServerPolicyId, 'server_1', '8.12.0');

        const res = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'My download source with secrets',
            host: 'http://test.fr:443',
            is_default: false,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
            },
            secrets: { ssl: { key: 'KEY1' } },
          })
          .expect(200);
        const dsId = res.body.item.id;
        const secretId = res.body.item.secrets.ssl.key.id;
        const secret = await getSecretById(secretId);
        // @ts-ignore _source unknown type
        expect(secret._source.value).to.equal('KEY1');

        const updatedRes = await supertest
          .put(`/api/fleet/agent_download_sources/${dsId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'My download source with secrets',
            host: 'http://test.fr:443',
            is_default: false,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
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

      it('should allow to resave ssl.key as secret if already existing', async function () {
        await clearAgents();
        await createFleetServerAgent(fleetServerPolicyId, 'server_1', '8.12.0');

        const res = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `My download source ${Date.now()}`,
            host: 'http://test.fr:443',
            is_default: false,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
              key: 'KEY1',
            },
          })
          .expect(200);
        const dsId = res.body.item.id;

        const updatedRes = await supertest
          .put(`/api/fleet/agent_download_sources/${dsId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `My download source ${Date.now()}`,
            host: 'http://test.fr:443',
            is_default: false,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
            },
            secrets: { ssl: { key: 'NEW_KEY' } },
          })
          .expect(200);
        const updatedSecretId = updatedRes.body.item.secrets.ssl.key.id;

        const updatedSecret = await getSecretById(updatedSecretId);

        // @ts-ignore _source unknown type
        expect(updatedSecret._source.value).to.equal('NEW_KEY');
      });

      it('should return a 404 when updating a non existing download source', async function () {
        await supertest
          .put(`/api/fleet/agent_download_sources/idonotexists`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'new host1',
            host: 'https://test.co',
            is_default: true,
          })
          .expect(404);
      });

      it('should return a 400 when passing a host that is not a valid uri', async function () {
        await supertest
          .put(`/api/fleet/agent_download_sources/${defaultDownloadSourceId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'new host1',
            host: 'not a valid uri',
            is_default: true,
          })
          .expect(400);
      });
    });

    describe('proxy_id behaviour', () => {
      const PROXY_ID = 'download-source-proxy-id';
      before(async () => {
        await supertest
          .post(`/api/fleet/fleet_server_hosts`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `Default ${Date.now()}`,
            host_urls: ['https://test.fr:8080'],
            is_default: true,
          })
          .expect(200);

        await supertest
          .post(`/api/fleet/proxies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            id: PROXY_ID,
            name: 'Download source proxy test',
            url: 'https://some.source.proxy:3232',
          })
          .expect(200);
      });

      it('should allow creating a new download source host with a proxy_id ', async function () {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'download source with valid proxy id',
            host: 'http://test.fr:443',
            proxy_id: PROXY_ID,
            is_default: false,
          })
          .expect(200);

        const { id: _, ...itemWithoutId } = postResponse.item;
        expect(itemWithoutId).to.eql({
          name: 'download source with valid proxy id',
          host: 'http://test.fr:443',
          proxy_id: PROXY_ID,
          is_default: false,
        });
      });

      it('should set agent.download.proxy_url on the full agent policy', async function () {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'download source with valid proxy id for agent test',
            host: 'http://test.fr:443',
            proxy_id: PROXY_ID,
            is_default: false,
          })
          .expect(200);

        const { id: downloadSourceId } = postResponse.item;

        const { body: postAgentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'agent policy with download source',
            namespace: 'default',
            description: '',
            is_default: false,
            download_source_id: downloadSourceId,
          })
          .expect(200);
        const { id: agentPolicyId } = postAgentPolicyResponse.item;
        await supertest
          .post(`/api/fleet/package_policies`)
          .set('kbn-xsrf', 'xxx')
          .send({
            force: true,
            package: {
              name: 'fleet_server',
              version: '1.3.1',
            },
            name: `Fleet Server 1`,
            namespace: 'default',
            policy_ids: [agentPolicyId],
            vars: {},
            inputs: {
              'fleet_server-fleet-server': {
                enabled: true,
                vars: {
                  custom: '',
                },
                streams: {},
              },
            },
          })
          .expect(200);

        const { body: getAgentPolicyResponse } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyId}/full`)
          .set('kbn-xsrf', 'xxxx')
          .send()
          .expect(200);

        expect(getAgentPolicyResponse.item.agent.download.proxy_url).to.eql(
          'https://some.source.proxy:3232'
        );
      });

      it('should not allow creating a new download source host with an invalid proxy_id ', async function () {
        await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'My download source with invalid proxy',
            host: 'http://test.fr:443',
            proxy_id: 'this-proxy-id-does-not-exist',
            is_default: false,
          })
          .expect(400);
      });

      it('should allow proxy_id to be set to null', async function () {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Download source with null proxy id',
            host: 'http://test.fr:443',
            proxy_id: PROXY_ID,
            is_default: false,
          })
          .expect(200);

        const { id, ...itemWithoutId } = postResponse.item;
        expect(itemWithoutId).to.eql({
          name: 'Download source with null proxy id',
          host: 'http://test.fr:443',
          proxy_id: PROXY_ID,
          is_default: false,
        });

        await supertest
          .put(`/api/fleet/agent_download_sources/${id}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ...itemWithoutId,
            proxy_id: null,
          })
          .expect(200);

        const { body: getResponse } = await supertest
          .get(`/api/fleet/agent_download_sources/${id}`)
          .set('kbn-xsrf', 'xxxx')
          .send()
          .expect(200);

        expect(getResponse.item.proxy_id).to.eql(null);
      });

      it('setting proxy_id to null should remove the proxy from the agent policy', async function () {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'download source which proxy_id will be set to null',
            host: 'http://test.fr:443',
            proxy_id: PROXY_ID,
            is_default: false,
          })
          .expect(200);

        const { id: downloadSourceId, ...itemWithoutId } = postResponse.item;

        const { body: postAgentPolicyResponse } = await supertest
          .post(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'agent policy with download source proxy_id which will be set to null',
            namespace: 'default',
            description: '',
            is_default: false,
            download_source_id: downloadSourceId,
          })
          .expect(200);

        const { id: agentPolicyId } = postAgentPolicyResponse.item;

        const { body: getAgentPolicyResponse } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyId}/full`)
          .set('kbn-xsrf', 'xxxx')
          .send();

        expect(getAgentPolicyResponse.item.agent.download.proxy_url).to.eql(
          'https://some.source.proxy:3232'
        );

        await supertest
          .put(`/api/fleet/agent_download_sources/${downloadSourceId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            ...itemWithoutId,
            proxy_id: null,
          })
          .expect(200);

        const { body: getAgentPolicyNullResponse } = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyId}/full`)
          .set('kbn-xsrf', 'xxxx')
          .send()
          .expect(200);

        expect(getAgentPolicyNullResponse.item.agent.download.proxy_url).to.eql(undefined);
      });
    });

    describe('DELETE /agent_download_sources/{sourceId}', () => {
      let sourceId: string;
      let defaultDSIdToDelete: string;

      before(async () => {
        const { body: postResponse } = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Download source to delete test',
            host: 'https://test.co',
          })
          .expect(200);
        sourceId = postResponse.item.id;

        const { body: defaultDSPostResponse } = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'Default download source to delete test',
            host: 'https://test.co',
            is_default: true,
          })
          .expect(200);
        defaultDSIdToDelete = defaultDSPostResponse.item.id;
      });

      it('should delete secrets when deleting a download source object', async function () {
        await clearAgents();
        await createFleetServerAgent(fleetServerPolicyId, 'server_1', '8.12.0');
        const res = await supertest
          .post(`/api/fleet/agent_download_sources`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `My download source ${Date.now()}`,
            host: 'http://test.fr:443',
            is_default: false,
            ssl: {
              certificate_authorities: ['cert authorities'],
              certificate: 'path/to/cert',
            },
            secrets: { ssl: { key: 'KEY1' } },
          })
          .expect(200);
        const dsId = res.body.item.id;
        const secretId = res.body.item.secrets.ssl.key.id;
        await supertest
          .delete(`/api/fleet/agent_download_sources/${dsId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        try {
          await getSecretById(secretId);
          expect().fail('Secret should have been deleted');
        } catch (e) {
          // not found
        }
      });

      it('should return a 400 when trying to delete a default download source host ', async function () {
        await supertest
          .delete(`/api/fleet/agent_download_sources/${defaultDSIdToDelete}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);
      });

      it('should return a 404 when deleting a non existing entry ', async function () {
        await supertest
          .delete(`/api/fleet/agent_download_sources/idonotexists`)
          .set('kbn-xsrf', 'xxxx')
          .expect(404);
      });

      it('should allow to delete a download source value ', async function () {
        const { body: deleteResponse } = await supertest
          .delete(`/api/fleet/agent_download_sources/${sourceId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(deleteResponse.id).to.eql(sourceId);
      });
    });
  });
}
