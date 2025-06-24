/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import axios from 'axios';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

interface IntegrationPackage {
  name: string;
  version: string;
}

export default ({ getService }: FtrProviderContext) => {
  const security = getService('security');
  const retry = getService('retry');
  const remoteEs = getService('remoteEs' as 'es');
  const localEs = getService('es');
  const supertest = getService('supertest');

  describe('Fleet Multi Cluster Sync Integrations E2E', function () {
    before(async () => {
      await security.testUser.setRoles(['superuser']);
    });

    const installPackage = ({ name, version }: IntegrationPackage) => {
      return supertest
        .post(`/api/fleet/epm/packages/${name}/${version}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    };

    const uninstallPackage = ({ name, version }: IntegrationPackage) => {
      return supertest
        .delete(`/api/fleet/epm/packages/${name}/${version}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true })
        .expect(200);
    };

    async function createRemoteServiceToken(): Promise<string> {
      const { token } = await remoteEs.security.createServiceToken({
        namespace: 'elastic',
        service: 'fleet-server-remote',
      });
      return token.value;
    }

    async function createRemoteAPIKey(): Promise<string> {
      const apiKeyResp = await remoteEs.security.createApiKey({
        name: 'integration_sync_api_key',
        role_descriptors: {
          integration_writer: {
            cluster: [],
            indices: [],
            applications: [
              {
                application: 'kibana-.kibana',
                privileges: ['feature_fleet.read', 'feature_fleetv2.read'],
                resources: ['*'],
              },
            ],
          },
        },
      });
      return apiKeyResp.encoded;
    }

    async function createRemoteOutput() {
      await supertest
        .post('/api/fleet/outputs')
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: 'remote-elasticsearch1',
          name: 'Remote ES Output',
          type: 'remote_elasticsearch',
          hosts: ['http://localhost:9221'],
          kibana_api_key: await createRemoteAPIKey(),
          kibana_url: 'http://localhost:5621',
          sync_integrations: true,
          sync_uninstalled_integrations: true,
          secrets: {
            service_token: await createRemoteServiceToken(),
          },
        })
        .expect(200);
    }

    async function createLocalOutputOnRemote() {
      const response = await axios.post(
        'http://localhost:5621/api/fleet/outputs',
        {
          id: 'es',
          type: 'elasticsearch',
          name: 'Local ES Output',
          hosts: ['http://localhost:9221'],
        },
        {
          auth: { username: 'elastic', password: 'changeme' },
          headers: { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'fleet-e2e' },
        }
      );
      expect(response.status).to.be(200);
    }

    async function addRemoteCluster() {
      const resp = await remoteEs.cluster.putSettings({
        persistent: {
          cluster: {
            remote: {
              local: {
                seeds: ['localhost:9300'],
              },
            },
          },
        },
      });
      expect(resp.acknowledged).to.be(true);
    }

    async function createFollowerIndex() {
      const resp = await remoteEs.ccr.follow({
        index: 'fleet-synced-integrations-ccr-local',
        leader_index: 'fleet-synced-integrations',
        remote_cluster: 'local',
        wait_for_active_shards: 'all',
      });
      expect(resp.follow_index_created).to.be(true);
    }

    async function queryFollowerIndexDoc() {
      const resp = await remoteEs.get({
        id: 'fleet-synced-integrations',
        index: 'fleet-synced-integrations-ccr-local',
      });
      expect(resp.found).to.be(true);
    }

    async function verifySyncIntegrationsStatus(isUninstalled = false) {
      const resp = await supertest
        .get('/api/fleet/remote_synced_integrations/remote-elasticsearch1/remote_status')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
      const respJson = JSON.parse(resp.text);
      const nginxIntegration = respJson.integrations.find(
        (int: any) => int.package_name === 'nginx'
      );
      expect(nginxIntegration?.sync_status).to.be('completed');
      if (isUninstalled) {
        expect(nginxIntegration?.install_status.remote).to.be('not_installed');
      }
    }

    async function verifyPackageInstalledOnRemote() {
      const resp = await remoteEs.get({
        id: 'epm-packages:nginx',
        index: '.kibana_ingest',
      });
      expect(resp.found).to.be(true);
      expect((resp._source as any)?.['epm-packages'].install_status).to.be('installed');
    }

    async function verifyPackageUninstalledOnRemote() {
      const resp = await remoteEs.get(
        {
          id: 'epm-packages:nginx',
          index: '.kibana_ingest',
        },
        { ignore: [404] }
      );
      expect(resp.found).to.be(false);
    }

    it('should sync integrations to remote cluster when enabled on remote ES output', async () => {
      await installPackage({ name: 'nginx', version: '2.0.0' });

      await createRemoteOutput();

      await createLocalOutputOnRemote();

      await addRemoteCluster();

      await createFollowerIndex();

      await retry.tryForTime(10000, async () => {
        await queryFollowerIndexDoc();
      });

      // check nginx package is installed on remote
      await retry.tryForTime(20000, async () => {
        await verifySyncIntegrationsStatus();

        await verifyPackageInstalledOnRemote();
      });

      // verify uninstalled packages are synced
      await uninstallPackage({ name: 'nginx', version: '2.0.0' });

      await retry.tryForTime(20000, async () => {
        await verifySyncIntegrationsStatus(true);
        await verifyPackageUninstalledOnRemote();
      });
    });

    after(async () => {
      // Clean up the remote output
      await supertest
        .delete('/api/fleet/outputs/remote-elasticsearch1')
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      // Clean up the local output on remote
      const response = await axios.delete('http://localhost:5621/api/fleet/outputs/es', {
        auth: { username: 'elastic', password: 'changeme' },
        headers: { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'fleet-e2e' },
      });
      expect(response.status).to.be(200);

      await localEs.indices.delete({
        index: 'fleet-synced-integrations',
      });
      await remoteEs.indices.delete({
        index: 'fleet-synced-integrations-ccr-local',
      });
      await security.testUser.restoreDefaults();
    });
  });
};
