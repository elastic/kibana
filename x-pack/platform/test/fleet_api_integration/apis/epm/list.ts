/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Client } from '@elastic/elasticsearch';
import {
  INGEST_SAVED_OBJECT_INDEX,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common/constants';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { testUsers } from '../test_users';
import { bundlePackage, removeBundledPackages } from './install_bundled';
import { SpaceTestApiClient } from '../space_awareness/api_helper';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const fleetAndAgents = getService('fleetAndAgents');
  const kibanaServer = getService('kibanaServer');
  const es: Client = getService('es');
  const apiClient = new SpaceTestApiClient(supertest);

  // use function () {} and not () => {} here
  // because `this` has to point to the Mocha context
  // see https://mochajs.org/#arrow-functions

  describe('EPM - list', function () {
    skipIfNoDockerRegistry(providerContext);
    const log = getService('log');

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
    });
    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await removeBundledPackages(log);
    });

    describe('list api tests', () => {
      it('lists all packages from the registry', async function () {
        const fetchPackageList = async () => {
          const response = await supertest
            .get('/api/fleet/epm/packages')
            .set('kbn-xsrf', 'xxx')
            .expect(200);
          return response.body;
        };
        const listResponse = await fetchPackageList();
        expect(listResponse.items.length).not.to.be(0);
      });

      it('lists all limited packages from the registry', async function () {
        await bundlePackage('endpoint-8.6.1');
        const fetchLimitedPackageList = async () => {
          const response = await supertest
            .get('/api/fleet/epm/packages/limited')
            .set('kbn-xsrf', 'xxx')
            .expect(200);
          return response.body;
        };
        const listResponse = await fetchLimitedPackageList();

        expect(listResponse.items.sort()).to.eql(['endpoint'].sort());
      });

      it('Allow to retrieve package policies count', async function () {
        await apiClient.installPackage({ pkgName: 'nginx', force: true, pkgVersion: '1.20.0' });
        await apiClient.createPackagePolicy(undefined, {
          policy_ids: [],
          name: `test-nginx-${Date.now()}`,
          description: 'test',
          package: {
            name: 'nginx',
            version: '1.20.0',
          },
          inputs: {},
        });

        const fetchPackageList = async () => {
          const response = await supertest
            .get('/api/fleet/epm/packages?withPackagePoliciesCount=true')
            .set('kbn-xsrf', 'xxx')
            .expect(200);
          return response.body;
        };
        const listResponse = await fetchPackageList();
        expect(listResponse.items.length).not.to.be(0);
        for (const item of listResponse.items) {
          if (item.name === 'nginx') {
            expect(item.packagePoliciesInfo.count).eql(1);
          } else {
            expect(item.packagePoliciesInfo.count).eql(0);
          }
        }
      });

      it('counts package policies whose latest_revision field is absent (simulates 8.x policies after upgrade)', async function () {
        // Install nginx and create a policy — the normal path sets latest_revision:true.
        await apiClient.installPackage({ pkgName: 'nginx', force: true, pkgVersion: '1.20.0' });
        const policyRes = await apiClient.createPackagePolicy(undefined, {
          policy_ids: [],
          name: `test-nginx-legacy-${Date.now()}`,
          description: 'test',
          package: { name: 'nginx', version: '1.20.0' },
          inputs: {},
        });
        const policyId = policyRes.item.id;

        // Simulate an 8.x policy by removing the latest_revision field from the SO document.
        await es.updateByQuery({
          index: INGEST_SAVED_OBJECT_INDEX,
          refresh: true,
          script: {
            lang: 'painless',
            source: `ctx._source['${PACKAGE_POLICY_SAVED_OBJECT_TYPE}'].remove('latest_revision')`,
          },
          query: {
            bool: {
              must: [
                { term: { type: PACKAGE_POLICY_SAVED_OBJECT_TYPE } },
                { term: { _id: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}:${policyId}` } },
              ],
            },
          },
        });

        try {
          const listResponse = await supertest
            .get('/api/fleet/epm/packages?withPackagePoliciesCount=true')
            .set('kbn-xsrf', 'xxx')
            .expect(200);

          const nginxItem = listResponse.body.items.find((item: any) => item.name === 'nginx');
          expect(nginxItem).to.be.ok();
          // The policy with absent latest_revision must be counted (NOT false filter).
          expect(nginxItem.packagePoliciesInfo.count).to.be.greaterThan(0);
        } finally {
          // Restore latest_revision:true so this document does not affect other tests.
          await es.updateByQuery({
            index: INGEST_SAVED_OBJECT_INDEX,
            refresh: true,
            script: {
              lang: 'painless',
              source: `ctx._source['${PACKAGE_POLICY_SAVED_OBJECT_TYPE}']['latest_revision'] = true`,
            },
            query: {
              bool: {
                must: [
                  { term: { type: PACKAGE_POLICY_SAVED_OBJECT_TYPE } },
                  { term: { _id: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}:${policyId}` } },
                ],
              },
            },
          });
          await apiClient.deletePackagePolicy(policyId).catch(() => {});
        }
      });

      it('does not count :prev (latest_revision:false) policies in the package policies count', async function () {
        // Install nginx (may already be installed from previous test — force is safe).
        await apiClient.installPackage({ pkgName: 'nginx', force: true, pkgVersion: '1.20.0' });

        // Inject a :prev rollback document directly into the SO index to simulate the state
        // created by the package rollback feature.
        const prevDocId = `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}:fake-rollback-id:prev`;
        await es.index({
          index: INGEST_SAVED_OBJECT_INDEX,
          id: prevDocId,
          refresh: true,
          document: {
            type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
            namespaces: ['default'],
            [PACKAGE_POLICY_SAVED_OBJECT_TYPE]: {
              name: 'nginx-prev',
              namespace: 'default',
              package: { name: 'nginx', title: 'Nginx', version: '1.19.0' },
              enabled: true,
              policy_id: 'nonexistent-policy',
              policy_ids: ['nonexistent-policy'],
              inputs: [],
              revision: 1,
              latest_revision: false,
              created_at: new Date().toISOString(),
              created_by: 'elastic',
              updated_at: new Date().toISOString(),
              updated_by: 'elastic',
            },
          },
        });

        const listResponse = await supertest
          .get('/api/fleet/epm/packages?withPackagePoliciesCount=true')
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        const nginxItem = listResponse.body.items.find((item: any) => item.name === 'nginx');
        expect(nginxItem).to.be.ok();
        // The :prev document must not be counted — it has latest_revision:false.
        // Count should only reflect policies where latest_revision is true or absent.
        const statsRes = await supertest
          .get('/api/fleet/epm/packages/nginx/stats')
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        // The stats endpoint (Bug 3 fix) must also exclude the :prev document.
        expect(statsRes.body.response.package_policy_count).to.equal(
          nginxItem.packagePoliciesInfo.count
        );

        // Clean up the injected document.
        await es
          .delete({ index: INGEST_SAVED_OBJECT_INDEX, id: prevDocId, refresh: true })
          .catch(() => {});
      });

      it('allows user with only fleet permission to access', async () => {
        await supertestWithoutAuth
          .get('/api/fleet/epm/packages')
          .auth(testUsers.fleet_all_only.username, testUsers.fleet_all_only.password)
          .expect(200);
      });
      it('allows user with only integrations permission to access', async () => {
        await supertestWithoutAuth
          .get('/api/fleet/epm/packages')
          .auth(testUsers.integr_all_only.username, testUsers.integr_all_only.password)
          .expect(200);
      });
      it('allows user with integrations read permission to access', async () => {
        await supertestWithoutAuth
          .get('/api/fleet/epm/packages')
          .auth(testUsers.fleet_all_int_read.username, testUsers.fleet_all_int_read.password)
          .expect(200);
      });
      it('does not allow user with the correct permissions', async () => {
        await supertestWithoutAuth
          .get('/api/fleet/epm/packages')
          .auth(testUsers.fleet_no_access.username, testUsers.fleet_no_access.password)
          .expect(403);
      });
    });
  });
}
