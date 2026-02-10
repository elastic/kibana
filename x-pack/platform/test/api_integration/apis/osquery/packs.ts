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

      expect(inputs[0].config.osquery.value.packs.TestPack.queries.testQuery.query).to.be(
        singleLineQuery
      );
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

      expect(inputs[0].config.osquery.value.packs.TestPack.queries.testQuery.query).to.be(
        singleLineQuery
      );
    });
  });
}
