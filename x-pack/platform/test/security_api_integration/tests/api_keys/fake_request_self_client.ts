/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esSupertest = getService('esSupertest');
  const esSupertestWithoutAuth = getService('esSupertestWithoutAuth');
  const supertest = getService('supertest');

  describe('FakeRequest self HTTP client', () => {
    it('preserves API key authentication and authorization for an internal self call', async () => {
      const { body: apiKey } = await esSupertest
        .post('/_security/api_key')
        .send({
          name: 'fake-request-self-client',
          role_descriptors: {
            fake_request_self_client: {
              cluster: ['manage'],
            },
          },
        })
        .expect(200);

      const { body: authenticatedUser } = await esSupertestWithoutAuth
        .get('/_security/_authenticate')
        .set('authorization', `ApiKey ${apiKey.encoded}`)
        .expect(200);

      const { body } = await supertest
        .post('/test_endpoints/self_client/fake_request')
        .set('kbn-xsrf', 'xxx')
        .send({ apiKey: apiKey.encoded })
        .expect(200);

      expect(body).to.eql({ username: authenticatedUser.username, hasManage: true });

      await supertest
        .post('/test_endpoints/self_client/fake_request')
        .set('kbn-xsrf', 'xxx')
        .send({})
        .expect(401);
    });
  });
}
