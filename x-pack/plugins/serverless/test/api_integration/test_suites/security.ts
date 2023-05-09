/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const serverlessCommonApi = getService('serverlessCommonApi');
  const supertest = getService('supertest');

  describe('security', function () {
    it('rejects request to create user', async () => {
      const { body, status } = await supertest
        .post(`/internal/security/users/some_testuser`)
        .set(serverlessCommonApi.getCommonRequestHeader())
        .send({ username: 'some_testuser', password: 'testpassword', roles: [] });

      // in a non-serverless environment this would succeed with a 200
      serverlessCommonApi.assertResponseStatusCode(400, status, body);
    });
  });
}
