/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const security = getService('security');
  const es = getService('es');

  const mockUserName = 'test-user';
  const mockUserPassword = 'test-password';

  describe('Users', () => {
    beforeEach(async () => {
      await security.user.create(mockUserName, { password: mockUserPassword, roles: [] });
    });

    afterEach(async () => {
      await security.user.delete(mockUserName);
    });

    it('should disable user', async () => {
      await supertest
        .post(`/internal/security/users/${mockUserName}/_disable`)
        .set('kbn-xsrf', 'xxx')
        .expect(204);

      const body = await es.security.getUser({ username: mockUserName });
      expect(body[mockUserName].enabled).to.be(false);
    });

    it('should enable user', async () => {
      await supertest
        .post(`/internal/security/users/${mockUserName}/_enable`)
        .set('kbn-xsrf', 'xxx')
        .expect(204);

      const body = await es.security.getUser({ username: mockUserName });
      expect(body[mockUserName].enabled).to.be(true);
    });
  });
}
