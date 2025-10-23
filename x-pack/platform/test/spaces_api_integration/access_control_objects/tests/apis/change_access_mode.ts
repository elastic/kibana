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

  const activateSimpleUserProfile = async () => {
    const response = await es.security.activateUserProfile({
      username: 'simple_user',
      password: 'changeme',
      grant_type: 'password',
    });

    return {
      profileUid: response.uid,
    };
  };

  describe('#change_access_mode', () => {
    it('should allow admins to change access mode of any object', async () => {
      const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner('test_user', 'changeme');
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: false })
        .expect(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

      const { cookie: adminCookie } = await loginAsKibanaAdmin();
      const response = await supertestWithoutAuth
        .put('/access_control_objects/change_access_mode')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({
          objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
          newAccessMode: 'write_restricted',
        })
        .expect(200);
      expect(response.body.objects).to.have.length(1);
      expect(response.body.objects[0].id).to.eql(objectId);
      expect(response.body.objects[0].type).to.eql(ACCESS_CONTROL_TYPE);

      const getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .expect(200);

      expect(getResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');
    });

    it('allow owner to update object data after access mode change', async () => {
      const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner('test_user', 'changeme');
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: false })
        .expect(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

      const { cookie: adminCookie } = await loginAsKibanaAdmin();
      const response = await supertestWithoutAuth
        .put('/access_control_objects/change_access_mode')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({
          objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
          newAccessMode: 'write_restricted',
        })
        .expect(200);
      expect(response.body.objects).to.have.length(1);
      expect(response.body.objects[0].id).to.eql(objectId);
      expect(response.body.objects[0].type).to.eql(ACCESS_CONTROL_TYPE);

      const getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .expect(200);

      expect(getResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');

      const updateResponse = await supertestWithoutAuth
        .put('/access_control_objects/update')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ objectId, type: ACCESS_CONTROL_TYPE })
        .expect(200);
      expect(updateResponse.body.id).to.eql(objectId);
      expect(updateResponse.body.attributes).to.have.property('description', 'updated description');
    });

    it('should throw when trying to change access mode on locked objects when not owner', async () => {
      const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner('test_user', 'changeme');
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);

      const objectId = createResponse.body.id;
      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

      await activateSimpleUserProfile();
      const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('simple_user', 'changeme');
      const updateResponse = await supertestWithoutAuth
        .put('/access_control_objects/change_access_mode')
        .set('kbn-xsrf', 'true')
        .set('cookie', notOwnerCookie.cookieString())
        .send({
          objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
          newAccessMode: 'write_restricted',
        })
        .expect(403);
      expect(updateResponse.body).to.have.property('message');
      expect(updateResponse.body.message).to.contain(
        `Access denied: Unable to manage access control for ${ACCESS_CONTROL_TYPE}`
      );
    });

    it('allows updates by non-owner after removing write-restricted access mode', async () => {
      const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner('test_user', 'changeme');
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

      await supertestWithoutAuth
        .put('/access_control_objects/change_access_mode')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({
          objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
          newAccessMode: 'default',
        })
        .expect(200);

      await createSimpleUser(['kibana_savedobjects_editor']);
      const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('simple_user', 'changeme');

      const updateResponse = await supertestWithoutAuth
        .put('/access_control_objects/update')
        .set('kbn-xsrf', 'true')
        .set('cookie', notOwnerCookie.cookieString())
        .send({ objectId, type: ACCESS_CONTROL_TYPE })
        .expect(200);
      expect(updateResponse.body.id).to.eql(objectId);
      expect(updateResponse.body.attributes).to.have.property('description', 'updated description');
    });
  });
}
