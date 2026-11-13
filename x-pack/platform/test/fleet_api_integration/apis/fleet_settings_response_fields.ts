/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { setupTestUsers, testUsers } from './test_users';

const OUTPUT_ID = 'test-response-fields-output';
const DOWNLOAD_SOURCE_ID = 'test-response-fields-download-source';
const FLEET_SERVER_HOST_ID = 'test-response-fields-fleet-server-host';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  const getAs = async (user: { username: string; password: string }, path: string) => {
    const { body } = await supertestWithoutAuth
      .get(path)
      .auth(user.username, user.password)
      .expect(200);
    return body;
  };

  const findItem = (items: any[], id: string) => {
    const item = items.find((i) => i.id === id);
    expect(item).not.to.be(undefined);
    return item;
  };

  // Values are either stored in the object or as references in `secrets`, depending on whether
  // secret storage is enabled.
  const expectFullOutput = (output: any) => {
    expect(output.kibana_api_key).to.equal('test-kibana-api-key');
    expect(output.service_token ?? output.secrets?.service_token).not.to.be(undefined);
    expect(output.ssl?.key ?? output.secrets?.ssl?.key).not.to.be(undefined);
    expect(output.ssl.certificate).to.equal('test-cert');
  };

  const expectSanitizedOutput = (output: any) => {
    expect(output).not.to.have.property('kibana_api_key');
    expect(output).not.to.have.property('service_token');
    expect(output).not.to.have.property('secrets');
    expect(output.ssl).not.to.have.property('key');
    expect(output.ssl.certificate).to.equal('test-cert');
    expect(output.hosts).to.eql(['https://test-remote.fr:9200']);
    expect(output.kibana_url).to.equal('https://test-remote-kibana.fr:5601');
  };

  const expectFullDownloadSource = (downloadSource: any) => {
    expect(downloadSource.ssl?.key ?? downloadSource.secrets?.ssl?.key).not.to.be(undefined);
    expect(downloadSource.auth?.password ?? downloadSource.secrets?.auth?.password).not.to.be(
      undefined
    );
    expect(downloadSource.auth.headers).to.eql([{ key: 'X-Custom', value: 'test-header-value' }]);
  };

  const expectSanitizedDownloadSource = (downloadSource: any) => {
    expect(downloadSource).not.to.have.property('secrets');
    expect(downloadSource.ssl).not.to.have.property('key');
    expect(downloadSource.ssl.certificate).to.equal('test-cert');
    expect(downloadSource.auth).to.eql({ username: 'test-user' });
  };

  const expectFullFleetServerHost = (host: any) => {
    expect(host.ssl?.key ?? host.secrets?.ssl?.key).not.to.be(undefined);
    expect(host.ssl?.es_key ?? host.secrets?.ssl?.es_key).not.to.be(undefined);
    expect(host.ssl?.agent_key ?? host.secrets?.ssl?.agent_key).not.to.be(undefined);
  };

  const expectSanitizedFleetServerHost = (host: any) => {
    expect(host).not.to.have.property('secrets');
    expect(host.ssl).not.to.have.property('key');
    expect(host.ssl).not.to.have.property('es_key');
    expect(host.ssl).not.to.have.property('agent_key');
    expect(host.ssl.certificate).to.equal('test-cert');
  };

  describe('fleet_settings_response_fields', () => {
    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await setupTestUsers(getService('security'));

      await supertest
        .post(`/api/fleet/outputs`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: OUTPUT_ID,
          name: 'Test response fields output',
          type: 'remote_elasticsearch',
          hosts: ['https://test-remote.fr:9200'],
          service_token: 'test-service-token',
          kibana_url: 'https://test-remote-kibana.fr:5601',
          kibana_api_key: 'test-kibana-api-key',
          ssl: { certificate: 'test-cert', key: 'test-ssl-key' },
        })
        .expect(200);

      await supertest
        .post(`/api/fleet/agent_download_sources`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: DOWNLOAD_SOURCE_ID,
          name: 'Test response fields download source',
          host: 'https://test-artifacts.fr',
          is_default: false,
          ssl: { certificate: 'test-cert', key: 'test-ssl-key' },
          auth: {
            username: 'test-user',
            password: 'test-password',
            headers: [{ key: 'X-Custom', value: 'test-header-value' }],
          },
        })
        .expect(200);

      await supertest
        .post(`/api/fleet/fleet_server_hosts`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: FLEET_SERVER_HOST_ID,
          name: 'Test response fields fleet server host',
          host_urls: ['https://test-fleet.fr:8220'],
          is_default: false,
          ssl: {
            certificate: 'test-cert',
            key: 'test-key',
            es_key: 'test-es-key',
            agent_key: 'test-agent-key',
          },
        })
        .expect(200);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    describe('outputs', () => {
      it('returns all fields to a user with fleet settings read', async () => {
        const list = await getAs(testUsers.fleet_settings_read_only, '/api/fleet/outputs');
        expectFullOutput(findItem(list.items, OUTPUT_ID));

        const one = await getAs(
          testUsers.fleet_settings_read_only,
          `/api/fleet/outputs/${OUTPUT_ID}`
        );
        expectFullOutput(one.item);
      });

      it('returns sanitized outputs to a user with only agent policies read', async () => {
        const list = await getAs(testUsers.fleet_agent_policies_read_only, '/api/fleet/outputs');
        expectSanitizedOutput(findItem(list.items, OUTPUT_ID));

        const one = await getAs(
          testUsers.fleet_agent_policies_read_only,
          `/api/fleet/outputs/${OUTPUT_ID}`
        );
        expectSanitizedOutput(one.item);
      });
    });

    describe('agent download sources', () => {
      it('returns all fields to a user with fleet settings read', async () => {
        const list = await getAs(
          testUsers.fleet_settings_read_only,
          '/api/fleet/agent_download_sources'
        );
        expectFullDownloadSource(findItem(list.items, DOWNLOAD_SOURCE_ID));

        const one = await getAs(
          testUsers.fleet_settings_read_only,
          `/api/fleet/agent_download_sources/${DOWNLOAD_SOURCE_ID}`
        );
        expectFullDownloadSource(one.item);
      });

      it('returns sanitized download sources to a user with only agent policies read', async () => {
        const list = await getAs(
          testUsers.fleet_agent_policies_read_only,
          '/api/fleet/agent_download_sources'
        );
        expectSanitizedDownloadSource(findItem(list.items, DOWNLOAD_SOURCE_ID));

        const one = await getAs(
          testUsers.fleet_agent_policies_read_only,
          `/api/fleet/agent_download_sources/${DOWNLOAD_SOURCE_ID}`
        );
        expectSanitizedDownloadSource(one.item);
      });
    });

    describe('fleet server hosts', () => {
      it('returns all fields to a user with fleet settings read', async () => {
        const list = await getAs(
          testUsers.fleet_settings_read_only,
          '/api/fleet/fleet_server_hosts'
        );
        expectFullFleetServerHost(findItem(list.items, FLEET_SERVER_HOST_ID));
      });

      it('returns sanitized fleet server hosts to a user with only agents all', async () => {
        const list = await getAs(testUsers.fleet_agents_all_only, '/api/fleet/fleet_server_hosts');
        expectSanitizedFleetServerHost(findItem(list.items, FLEET_SERVER_HOST_ID));
      });
    });
  });
}
