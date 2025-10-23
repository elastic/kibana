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
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const createSimpleUser = async (roles: string[] = ['viewer']) => {
    await es.security.putUser({
      username: 'simple_user',
      refresh: 'wait_for',
      password: 'changeme',
      roles,
    });
  };

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

  describe('#update', () => {
    it('should update write-restricted objects owned by the same user', async () => {
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
      expect(createResponse.body.attributes).to.have.property('description', 'test');
      expect(createResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');
      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

      const updateResponse = await supertestWithoutAuth
        .put('/access_control_objects/update')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ objectId, type: ACCESS_CONTROL_TYPE })
        .expect(200);

      expect(updateResponse.body.id).to.eql(objectId);
      expect(updateResponse.body.attributes).to.have.property('description', 'updated description');
    });

    it('should throw when updating write-restricted objects owned by a different user when not admin', async () => {
      const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin();
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.attributes).to.have.property('description', 'test');
      expect(createResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');
      expect(createResponse.body.accessControl).to.have.property('owner', adminProfileUid);

      const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('test_user', 'changeme');
      const updateResponse = await supertestWithoutAuth
        .put('/access_control_objects/update')
        .set('kbn-xsrf', 'true')
        .set('cookie', notOwnerCookie.cookieString())
        .send({ objectId, type: ACCESS_CONTROL_TYPE })
        .expect(403);
      expect(updateResponse.body).to.have.property('message');
      expect(updateResponse.body.message).to.contain(`Unable to update ${ACCESS_CONTROL_TYPE}`);
    });

    it('objects with default accessMode can be modified by non-owners', async () => {
      const { cookie: adminCookie } = await loginAsKibanaAdmin();
      const response = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE })
        .expect(200);
      const objectId = response.body.id;

      await createSimpleUser(['kibana_savedobjects_editor']);
      const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('simple_user', 'changeme');
      const updateResponse = await supertestWithoutAuth
        .put('/access_control_objects/update')
        .set('kbn-xsrf', 'true')
        .set('cookie', notOwnerCookie.cookieString())
        .send({ objectId, type: ACCESS_CONTROL_TYPE });

      expect(updateResponse.body.id).to.eql(objectId);
      expect(updateResponse.body.attributes).to.have.property('description', 'updated description');
    });

    it('allows admin to update objects owned by different user', async () => {
      const { cookie: ownerCookie } = await loginAsObjectOwner('test_user', 'changeme');
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const objectId = createResponse.body.id;

      const { cookie: adminCookie } = await loginAsKibanaAdmin();
      const updateResponse = await supertestWithoutAuth
        .put('/access_control_objects/update')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({ objectId, type: ACCESS_CONTROL_TYPE })
        .expect(200);

      expect(updateResponse.body.id).to.eql(objectId);
      expect(updateResponse.body.attributes).to.have.property('description', 'updated description');
    });
  });
}
