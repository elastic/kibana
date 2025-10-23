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

  describe('#bulk_update', () => {
    it('allow owner to bulk update objects marked as write-restricted', async () => {
      const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
        await loginAsObjectOwner('test_user', 'changeme');
      const firstObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const { id: objectId1, type: type1 } = firstObject.body;

      const secondObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const { id: objectId2, type: type2 } = secondObject.body;

      const objects = [
        {
          id: objectId1,
          type: type1,
        },
        {
          id: objectId2,
          type: type2,
        },
      ];

      const res = await supertestWithoutAuth
        .post('/access_control_objects/bulk_update')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({
          objects,
        })
        .expect(200);
      for (const { id, attributes, accessControl } of res.body.saved_objects) {
        const object = objects.find((obj) => obj.id === id);
        expect(object).to.not.be(undefined);
        expect(attributes).to.have.property('description', 'updated description');
        expect(accessControl).to.have.property('owner', objectOwnerProfileUid);
        expect(accessControl).to.have.property('accessMode', 'write_restricted');
      }
    });

    it('allow admin to bulk update objects marked as write-restricted', async () => {
      const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
        await loginAsObjectOwner('test_user', 'changeme');
      const firstObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const { id: objectId1, type: type1 } = firstObject.body;

      const secondObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const { id: objectId2, type: type2 } = secondObject.body;

      const objects = [
        {
          id: objectId1,
          type: type1,
        },
        {
          id: objectId2,
          type: type2,
        },
      ];
      const { cookie: adminCookie } = await loginAsKibanaAdmin();
      const res = await supertestWithoutAuth
        .post('/access_control_objects/bulk_update')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({
          objects,
        })
        .expect(200);
      for (const { id, attributes, accessControl } of res.body.saved_objects) {
        const object = objects.find((obj) => obj.id === id);
        expect(object).to.not.be(undefined);
        expect(attributes).to.have.property('description', 'updated description');
        expect(accessControl).to.have.property('owner', objectOwnerProfileUid);
        expect(accessControl).to.have.property('accessMode', 'write_restricted');
      }
    });

    it('does not allow non-owner to bulk update objects marked as write-restricted if not admin', async () => {
      await activateSimpleUserProfile();
      const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
      const firstObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const { id: objectId1, type: type1 } = firstObject.body;

      const secondObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const { id: objectId2, type: type2 } = secondObject.body;

      const objects = [
        {
          id: objectId1,
          type: type1,
        },
        {
          id: objectId2,
          type: type2,
        },
      ];
      const { cookie: nonOwnerCookie } = await loginAsNotObjectOwner('simple_user', 'changeme');
      const res = await supertestWithoutAuth
        .post('/access_control_objects/bulk_update')
        .set('kbn-xsrf', 'true')
        .set('cookie', nonOwnerCookie.cookieString())
        .send({
          objects,
        })
        .expect(403);
      expect(res.body).to.have.property('message');
      expect(res.body.message).to.contain(`Unable to bulk_update ${ACCESS_CONTROL_TYPE}`);
    });

    it('allows non-owner non-admin to bulk update objects in default mode ', async () => {
      const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
      const firstObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE })
        .expect(200);
      const { id: objectId1, type: type1 } = firstObject.body;

      const secondObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE })
        .expect(200);
      const { id: objectId2, type: type2 } = secondObject.body;

      const objects = [
        {
          id: objectId1,
          type: type1,
        },
        {
          id: objectId2,
          type: type2,
        },
      ];

      await createSimpleUser(['kibana_savedobjects_editor']);
      const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('simple_user', 'changeme');

      const res = await supertestWithoutAuth
        .post('/access_control_objects/bulk_update')
        .set('kbn-xsrf', 'true')
        .set('cookie', notOwnerCookie.cookieString())
        .send({
          objects,
        })
        .expect(200);
      for (const { id, attributes, accessControl } of res.body.saved_objects) {
        const object = objects.find((obj) => obj.id === id);
        expect(object).to.not.be(undefined);
        expect(attributes).to.have.property('description', 'updated description');
        expect(accessControl).to.have.property('accessMode', 'default');
      }
    });
  });
}
