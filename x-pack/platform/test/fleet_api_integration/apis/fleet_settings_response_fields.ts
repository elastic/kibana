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

// Users who can read outputs but not Fleet settings
const USERS_WITHOUT_SETTINGS_READ = [
  testUsers.fleet_agent_policies_read_only,
  testUsers.fleet_agent_policies_all_only,
];

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
    expect(output.service_token ?? output.secrets?.service_token).not.to.be(undefined);
    expect(output.ssl?.key ?? output.secrets?.ssl?.key).not.to.be(undefined);
    expect(output.ssl.certificate).to.equal('test-cert');
  };

  const expectSanitizedOutput = (output: any) => {
    expect(output).not.to.have.property('service_token');
    expect(output).not.to.have.property('secrets');
    expect(output.ssl).not.to.have.property('key');
    expect(output.ssl.certificate).to.equal('test-cert');
    expect(output.hosts).to.eql(['https://test-remote.fr:9200']);
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
          ssl: { certificate: 'test-cert', key: 'test-ssl-key' },
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

      for (const user of USERS_WITHOUT_SETTINGS_READ) {
        it(`returns sanitized outputs to ${user.username}`, async () => {
          const list = await getAs(user, '/api/fleet/outputs');
          expectSanitizedOutput(findItem(list.items, OUTPUT_ID));

          const one = await getAs(user, `/api/fleet/outputs/${OUTPUT_ID}`);
          expectSanitizedOutput(one.item);
        });
      }
    });
  });
}
