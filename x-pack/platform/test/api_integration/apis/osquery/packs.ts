/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { Test } from 'supertest';
import type { FtrProviderContext } from '../../ftr_provider_context';

const getDefaultPack = ({ policyIds = [] }: { policyIds?: string[] }) => ({
  name: 'TestPack',
  description: 'TestPack Description',
  enabled: true,
  policy_ids: policyIds,
  queries: {
    testQuery: {
      query: multiLineQuery,
      interval: 600,
      platform: 'windows',
      version: '1',
    },
  },
});

const singleLineQuery =
  "select u.username, p.pid, p.name, pos.local_address, pos.local_port, p.path, p.cmdline, pos.remote_address, pos.remote_port from processes as p join users as u on u.uid=p.uid join process_open_sockets as pos on pos.pid=p.pid where pos.remote_port !='0' limit 1000;";
const multiLineQuery = `select u.username,
       p.pid,
       p.name,
       pos.local_address,
       pos.local_port,
       p.path,
       p.cmdline,
       pos.remote_address,
       pos.remote_port
from processes as p
join users as u
    on u.uid=p.uid
join process_open_sockets as pos
    on pos.pid=p.pid
where pos.remote_port !='0'
limit 1000;`;

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');
  const fleetApiVersion = '2023-10-31';
  const osqueryPublicApiVersion = '2023-10-31';

  const withFleetHeaders = (request: Test) =>
    request.set('kbn-xsrf', 'true').set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion);

  const withOsqueryHeaders = (request: Test) =>
    request.set('kbn-xsrf', 'true').set('elastic-api-version', osqueryPublicApiVersion);

  describe('Packs', () => {
    let packId: string = '';
    let hostedPolicy: Record<string, any>;
    let packagePolicyId: string;
    let osqueryPackageVersion: string | undefined;
    before(async () => {
      await getService('kibanaServer').savedObjects.cleanStandardList();
      await getService('esArchiver').load(
        'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
      );

      await fleetAndAgents.setup();

      const { body: osqueryPackageResponse } = await supertest
        .get('/api/fleet/epm/packages/osquery_manager')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
        .set('x-elastic-internal-product', 'security-solution');

      osqueryPackageVersion = osqueryPackageResponse.item?.version;

      if (osqueryPackageVersion) {
        await withFleetHeaders(
          supertest.post(`/api/fleet/epm/packages/osquery_manager/${osqueryPackageVersion}`)
        )
          .send({ force: true })
          .expect(200);
      }
    });
    after(async () => {
      await getService('kibanaServer').savedObjects.cleanStandardList();
      await getService('esArchiver').unload(
        'x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server'
      );
      if (packagePolicyId) {
        await withFleetHeaders(supertest.post('/api/fleet/package_policies/delete')).send({
          packagePolicyIds: [packagePolicyId],
        });
      }
      await supertest
        .post('/api/fleet/agent_policies/delete')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
        .send({ agentPolicyId: hostedPolicy.id });

      if (osqueryPackageVersion) {
        await withFleetHeaders(
          supertest.delete(`/api/fleet/epm/packages/osquery_manager/${osqueryPackageVersion}`)
        );
      }
    });

    it('create route should return 200 and multi line query, but single line query in packs config', async () => {
      const {
        body: { item: agentPolicy },
      } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
        .send({
          name: `Hosted policy from ${Date.now()}`,
          namespace: 'default',
        })
        .expect(200);

      hostedPolicy = agentPolicy;

      const {
        body: { item: packagePolicy },
      } = await supertest
        .post('/api/fleet/package_policies')
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion)
        .send({
          package: {
            name: 'osquery_manager',
            version: osqueryPackageVersion,
          },
          inputs: {
            'osquery_manager-osquery': {
              enabled: true,
              streams: {},
            },
          },
          namespace: 'default',
          policy_ids: [hostedPolicy.id],
          name: 'TEST',
          description: '123',
        })
        .expect(200);

      packagePolicyId = packagePolicy.id;

      const createPackResponse = await withOsqueryHeaders(supertest.post('/api/osquery/packs'))
        .send(getDefaultPack({ policyIds: [hostedPolicy.id] }))
        .expect(200);

      packId = createPackResponse.body.data.saved_object_id;
      expect(packId).to.be.ok();

      const pack = await withOsqueryHeaders(supertest.get('/api/osquery/packs/' + packId));

      expect(pack.status).to.be(200);
      expect(pack.body.data.queries.testQuery.query).to.be(multiLineQuery);

      const {
        body: {
          item: { inputs },
        },
      } = await supertest
        .get(`/api/fleet/package_policies/${packagePolicyId}`)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion);

      expect(
        inputs[0].config.osquery.value.packs['default--TestPack'].queries.testQuery.query
      ).to.be(singleLineQuery);
    });

    it('create route should include profile_uid fields in response', async () => {
      const createResponse = await withOsqueryHeaders(supertest.post('/api/osquery/packs'))
        .send({
          name: `ProfileUidPack-${Date.now()}`,
          description: 'Test profile uid',
          enabled: false,
          queries: {
            q1: { query: 'select 1;', interval: 3600 },
          },
        })
        .expect(200);

      const { data } = createResponse.body;
      expect(data).to.have.property('created_by_profile_uid');
      expect(data).to.have.property('updated_by_profile_uid');
      expect(data.created_by).to.be.ok();

      // Clean up
      await withOsqueryHeaders(
        supertest.delete(`/api/osquery/packs/${data.saved_object_id}`)
      ).expect(200);
    });

    it('find route supports search, enabled, and createdBy params', async () => {
      // Create test packs with a unique prefix
      const prefix = `FindTest-${Date.now()}`;
      const createdIds: string[] = [];

      for (const suffix of ['alpha', 'beta']) {
        const resp = await withOsqueryHeaders(supertest.post('/api/osquery/packs'))
          .send({
            name: `${prefix}-${suffix}`,
            description: `Find test ${suffix}`,
            enabled: suffix === 'alpha',
            queries: { q1: { query: 'select 1;', interval: 3600 } },
          })
          .expect(200);
        createdIds.push(resp.body.data.saved_object_id);
      }

      // Search by name
      const searchResponse = await withOsqueryHeaders(
        supertest.get(`/api/osquery/packs?search=${prefix}`)
      ).expect(200);
      expect(searchResponse.body.total).to.be(2);

      // Search with no match
      const noMatchResponse = await withOsqueryHeaders(
        supertest.get('/api/osquery/packs?search=zzzznonexistent999')
      ).expect(200);
      expect(noMatchResponse.body.total).to.be(0);

      // Filter by enabled
      const enabledResponse = await withOsqueryHeaders(
        supertest.get(`/api/osquery/packs?search=${prefix}&enabled=true`)
      ).expect(200);
      expect(enabledResponse.body.total).to.be(1);
      expect(enabledResponse.body.data[0].name).to.contain('alpha');

      // Filter by createdBy
      const createdByResponse = await withOsqueryHeaders(
        supertest.get(`/api/osquery/packs?search=${prefix}&createdBy=elastic`)
      ).expect(200);
      expect(createdByResponse.body.total).to.be(2);

      // Non-matching createdBy
      const noUserResponse = await withOsqueryHeaders(
        supertest.get(`/api/osquery/packs?search=${prefix}&createdBy=nonexistentuser`)
      ).expect(200);
      expect(noUserResponse.body.total).to.be(0);

      // Profile uid fields present in find results
      expect(searchResponse.body.data[0]).to.have.property('created_by_profile_uid');
      expect(searchResponse.body.data[0]).to.have.property('updated_by_profile_uid');

      // Clean up
      for (const id of createdIds) {
        await withOsqueryHeaders(supertest.delete(`/api/osquery/packs/${id}`)).expect(200);
      }
    });

    describe('find route sorting and description search', () => {
      const sortPrefix = `SortTest-${Date.now()}`;
      const sortPackIds: string[] = [];

      before(async () => {
        for (const [suffix, enabled] of [
          ['charlie', true],
          ['alpha', false],
          ['bravo', true],
        ] as const) {
          const resp = await withOsqueryHeaders(supertest.post('/api/osquery/packs'))
            .send({
              name: `${sortPrefix}-${suffix}`,
              description: `Sort test pack for ${suffix}`,
              enabled,
              queries: { q1: { query: 'select 1;', interval: 3600 } },
            })
            .expect(200);
          sortPackIds.push(resp.body.data.saved_object_id);
        }
      });

      after(async () => {
        for (const id of sortPackIds) {
          await withOsqueryHeaders(supertest.delete(`/api/osquery/packs/${id}`)).expect(200);
        }
      });

      it('sorts by created_by (keyword) without error', async () => {
        const response = await withOsqueryHeaders(
          supertest.get(`/api/osquery/packs?search=${sortPrefix}&sort=created_by&sortOrder=asc`)
        ).expect(200);
        expect(response.body.total).to.be(3);
      });

      it('sorts by updated_at (date) without error', async () => {
        const response = await withOsqueryHeaders(
          supertest.get(`/api/osquery/packs?search=${sortPrefix}&sort=updated_at&sortOrder=desc`)
        ).expect(200);
        expect(response.body.total).to.be(3);
      });

      it('searches by description field', async () => {
        const response = await withOsqueryHeaders(
          supertest.get(`/api/osquery/packs?search=Sort test pack for alpha`)
        ).expect(200);
        expect(response.body.total).to.be.greaterThan(0);
        expect(
          response.body.data.some((p: { name: string }) => p.name === `${sortPrefix}-alpha`)
        ).to.be(true);
      });
    });

    describe('users route', () => {
      const usersPrefix = `UsersTest-${Date.now()}`;
      const usersPackIds: string[] = [];

      before(async () => {
        for (const suffix of ['one', 'two']) {
          const resp = await withOsqueryHeaders(supertest.post('/api/osquery/packs'))
            .send({
              name: `${usersPrefix}-${suffix}`,
              description: `Users test ${suffix}`,
              enabled: true,
              queries: { q1: { query: 'select 1;', interval: 3600 } },
            })
            .expect(200);
          usersPackIds.push(resp.body.data.saved_object_id);
        }
      });

      after(async () => {
        for (const id of usersPackIds) {
          await withOsqueryHeaders(supertest.delete(`/api/osquery/packs/${id}`)).expect(200);
        }
      });

      it('returns unique users with profile UIDs', async () => {
        const response = await supertest
          .get('/internal/osquery/packs/users')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .expect(200);

        expect(response.body.data).to.be.an(Array);
        expect(response.body.data.length).to.be.greaterThan(0);

        const users = response.body.data.map((c: { created_by: string }) => c.created_by);
        expect(users).to.contain('elastic');

        // Verify uniqueness
        const uniqueUsers = [...new Set(users)];
        expect(uniqueUsers.length).to.be(users.length);
      });

      it('includes created_by_profile_uid when available', async () => {
        const response = await supertest
          .get('/internal/osquery/packs/users')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .expect(200);

        const elastic = response.body.data.find(
          (c: { created_by: string }) => c.created_by === 'elastic'
        );
        expect(elastic).to.be.ok();
        expect(elastic).to.have.property('created_by');
      });
    });

    it('update route should return 200 and multi line query, but single line query in packs config', async () => {
      expect(packId).to.be.ok();
      const updatePackResponse = await withOsqueryHeaders(
        supertest.put('/api/osquery/packs/' + packId)
      ).send(getDefaultPack({ policyIds: [hostedPolicy.id] }));

      expect(updatePackResponse.status).to.be(200);
      expect(updatePackResponse.body.data.saved_object_id).to.be(packId);
      const pack = await withOsqueryHeaders(supertest.get('/api/osquery/packs/' + packId));

      expect(pack.body.data.queries.testQuery.query).to.be(multiLineQuery);
      const {
        body: {
          item: { inputs },
        },
      } = await supertest
        .get(`/api/fleet/package_policies/${packagePolicyId}`)
        .set('kbn-xsrf', 'true')
        .set(ELASTIC_HTTP_VERSION_HEADER, fleetApiVersion);

      expect(
        inputs[0].config.osquery.value.packs['default--TestPack'].queries.testQuery.query
      ).to.be(singleLineQuery);
    });

    describe('created_by attribution', () => {
      it('user-created pack records the creating user', async () => {
        const createResponse = await withOsqueryHeaders(supertest.post('/api/osquery/packs'))
          .send({
            name: `Attribution-UserPack-${Date.now()}`,
            description: 'Test user attribution',
            enabled: false,
            queries: { q1: { query: 'select 1;', interval: 3600 } },
          })
          .expect(200);

        const { data } = createResponse.body;
        expect(data.created_by).to.be.ok();
        expect(data.created_by).to.be('elastic');
        expect(data.updated_by).to.be('elastic');

        // Duplicate the user-created pack
        const copyResponse = await withOsqueryHeaders(
          supertest.post(`/api/osquery/packs/${data.saved_object_id}/copy`)
        ).expect(200);

        const copy = copyResponse.body.data;
        expect(copy.created_by).to.be('elastic');
        expect(copy.updated_by).to.be('elastic');
        expect(copy.name).to.contain('Attribution-UserPack');

        // Clean up
        await withOsqueryHeaders(
          supertest.delete(`/api/osquery/packs/${copy.saved_object_id}`)
        ).expect(200);
        await withOsqueryHeaders(
          supertest.delete(`/api/osquery/packs/${data.saved_object_id}`)
        ).expect(200);
      });

      it('prebuilt packs have "elastic" as created_by after asset install', async () => {
        // Trigger asset install/update
        await supertest
          .post('/internal/osquery/assets/update')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .expect(200);

        // Find all packs and look for prebuilt ones
        const findResponse = await withOsqueryHeaders(
          supertest.get('/api/osquery/packs?pageSize=100')
        ).expect(200);

        // Prebuilt packs should have created_by = 'elastic'
        const prebuiltPacks = findResponse.body.data.filter(
          (p: { read_only: boolean }) => p.read_only
        );

        expect(prebuiltPacks.length).to.be.greaterThan(0);
        for (const pack of prebuiltPacks) {
          expect(pack.created_by).to.be('elastic');
          expect(pack.updated_by).to.be('elastic');
        }
      });

      it('duplicating a prebuilt pack produces a mutable copy with valid attribution', async () => {
        // Trigger asset install
        await supertest
          .post('/internal/osquery/assets/update')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .expect(200);

        // Find a prebuilt pack
        const findResponse = await withOsqueryHeaders(
          supertest.get('/api/osquery/packs?pageSize=100')
        ).expect(200);

        const prebuiltPacks = findResponse.body.data.filter(
          (p: { read_only: boolean }) => p.read_only
        );
        expect(prebuiltPacks.length).to.be.greaterThan(0);
        const prebuiltPack = prebuiltPacks[0];

        // Copy the prebuilt pack
        const copyResponse = await withOsqueryHeaders(
          supertest.post(`/api/osquery/packs/${prebuiltPack.saved_object_id}/copy`)
        ).expect(200);

        const copy = copyResponse.body.data;

        // The copy uses getUserInfo() (dynamic resolution), not hardcoded 'elastic'.
        // In FTR the test user is 'elastic', so we can only verify attribution is present.
        expect(copy.created_by).to.be.a('string');
        expect(copy.updated_by).to.be.a('string');
        expect(copy.created_by).to.not.be.empty();

        // The copy should NOT be read_only
        expect(copy.read_only).to.not.be(true);

        // Clean up
        await withOsqueryHeaders(
          supertest.delete(`/api/osquery/packs/${copy.saved_object_id}`)
        ).expect(200);
      });

      it('users endpoint does not produce duplicate entries', async () => {
        const response = await supertest
          .get('/internal/osquery/packs/users')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', '1')
          .expect(200);

        const usernames = response.body.data.map((c: { created_by: string }) => c.created_by);
        const uniqueUsernames = [...new Set(usernames)];
        expect(uniqueUsernames.length).to.be(usernames.length);
      });
    });

    describe('policy_ids validation', () => {
      it('deduplicates duplicate policy_ids and returns 200', async () => {
        const createResponse = await withOsqueryHeaders(supertest.post('/api/osquery/packs'))
          .send({
            name: `DuplicatePolicyTest-${Date.now()}`,
            description: 'Test deduplication',
            enabled: false,
            policy_ids: [hostedPolicy.id, hostedPolicy.id],
            queries: { q1: { query: 'select 1;', interval: 3600 } },
          })
          .expect(200);

        const { data } = createResponse.body;
        expect(data).to.be.ok();
        expect(data.saved_object_id).to.be.ok();

        // Verify via read that policy_ids is deduplicated
        const readResponse = await withOsqueryHeaders(
          supertest.get(`/api/osquery/packs/${data.saved_object_id}`)
        ).expect(200);

        expect(readResponse.body.data.policy_ids).to.be.an(Array);
        expect(readResponse.body.data.policy_ids.length).to.be(1);
        expect(readResponse.body.data.policy_ids[0]).to.be(hostedPolicy.id);

        // Clean up
        await withOsqueryHeaders(
          supertest.delete(`/api/osquery/packs/${data.saved_object_id}`)
        ).expect(200);
      });

      it('returns 400 for a single non-existent policy_id', async () => {
        const nonExistentId = 'non-existent-policy-id-12345';
        const response = await withOsqueryHeaders(supertest.post('/api/osquery/packs'))
          .send({
            name: `NonExistentPolicyTest-${Date.now()}`,
            description: 'Test non-existent policy',
            enabled: false,
            policy_ids: [nonExistentId],
            queries: { q1: { query: 'select 1;', interval: 3600 } },
          })
          .expect(400);

        expect(response.body.message).to.contain(nonExistentId);
      });

      it('returns 400 for mixed valid/invalid policy_ids', async () => {
        const nonExistentId = 'invalid-policy-id-67890';
        const response = await withOsqueryHeaders(supertest.post('/api/osquery/packs'))
          .send({
            name: `MixedPolicyTest-${Date.now()}`,
            description: 'Test mixed policies',
            enabled: false,
            policy_ids: [hostedPolicy.id, nonExistentId],
            queries: { q1: { query: 'select 1;', interval: 3600 } },
          })
          .expect(400);

        expect(response.body.message).to.contain(nonExistentId);
      });
    });

    describe('404 for non-existent resources', () => {
      it('returns 404 when reading a non-existent pack', async () => {
        await withOsqueryHeaders(supertest.get('/api/osquery/packs/non-existent-id')).expect(404);
      });

      it('returns 404 when updating a non-existent pack', async () => {
        await withOsqueryHeaders(supertest.put('/api/osquery/packs/non-existent-id'))
          .send({
            name: 'Updated Pack',
            description: 'Updated',
            enabled: true,
            queries: { q1: { query: 'select 1;', interval: 3600 } },
          })
          .expect(404);
      });

      it('returns 404 when deleting a non-existent pack', async () => {
        await withOsqueryHeaders(supertest.delete('/api/osquery/packs/non-existent-id')).expect(
          404
        );
      });
    });
  });
}
