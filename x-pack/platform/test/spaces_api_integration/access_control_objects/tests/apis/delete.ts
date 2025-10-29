/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parse as parseCookie } from 'tough-cookie';

import { ACCESS_CONTROL_TYPE } from '@kbn/access-control-test-plugin/server';
import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';

import type { FtrProviderContext } from '../../../../functional/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const login = async (username: string, password: string | undefined) => {
    const response = await supertestWithoutAuth
      .post('/internal/security/login')
      .set('kbn-xsrf', 'xxx')
      .send({
        providerType: 'basic',
        providerName: 'basic',
        currentURL: '/',
        params: { username, password },
      })
      .expect(200);
    const cookie = parseCookie(response.headers['set-cookie'][0])!;
    const profileUidResponse = await supertestWithoutAuth
      .get('/internal/security/me')
      .set('Cookie', cookie.cookieString())
      .expect(200);
    return {
      cookie,
      profileUid: profileUidResponse.body.profile_uid,
    };
  };

  const loginAsKibanaAdmin = () => login(adminTestUser.username, adminTestUser.password);

  const loginAsObjectOwner = (username: string, password: string) => login(username, password);

  const loginAsNotObjectOwner = (username: string, password: string) => login(username, password);

  describe('#delete', () => {
    it('allow owner to delete object marked as write-restricted', async () => {
      const { cookie: objectOwnerCookie, profileUid } = await loginAsObjectOwner(
        'test_user',
        'changeme'
      );
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

      await supertestWithoutAuth
        .delete(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .expect(200);
    });

    it('allows admin to delete object marked as write-restricted', async () => {
      const { cookie: objectOwnerCookie, profileUid } = await loginAsObjectOwner(
        'test_user',
        'changeme'
      );
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

      const { cookie: adminCookie } = await loginAsKibanaAdmin();
      await supertestWithoutAuth
        .delete(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .expect(200);

      const getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .expect(404);
      expect(getResponse.body).to.have.property('message');
      expect(getResponse.body.message).to.contain(
        `Saved object [${ACCESS_CONTROL_TYPE}/${objectId}] not found`
      );
    });

    it('throws when trying to delete write-restricted object owned by a different user when not admin', async () => {
      const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin();
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.accessControl).to.have.property('owner', adminProfileUid);

      const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('test_user', 'changeme');
      const deleteResponse = await supertestWithoutAuth
        .delete(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', notOwnerCookie.cookieString())
        .expect(403);
      expect(deleteResponse.body).to.have.property('message');
      expect(deleteResponse.body.message).to.contain(`Unable to delete ${ACCESS_CONTROL_TYPE}`);
    });

    it('allows non-owner to delete object in default mode', async () => {
      const { cookie: ownerCookie } = await loginAsKibanaAdmin();
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE })
        .expect(200);

      const objectId = createResponse.body.id;
      const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('test_user', 'changeme');

      await supertestWithoutAuth
        .delete(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', notOwnerCookie.cookieString())
        .expect(200);
    });
  });
}
