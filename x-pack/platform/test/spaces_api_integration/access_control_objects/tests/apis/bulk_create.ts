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

  describe('#bulk_create', () => {
    it('should create write-restricted objects', async () => {
      const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
        await loginAsObjectOwner('test_user', 'changeme');

      const bulkCreateResponse = await supertestWithoutAuth
        .post('/access_control_objects/bulk_create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({
          objects: [
            { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
            { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
          ],
        });
      expect(bulkCreateResponse.body.saved_objects).to.have.length(2);
      for (const { accessControl } of bulkCreateResponse.body.saved_objects) {
        expect(accessControl).to.have.property('owner', objectOwnerProfileUid);
        expect(accessControl).to.have.property('accessMode', 'write_restricted');
      }
    });

    it('should allow overwriting objects owned by current user', async () => {
      const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
        await loginAsObjectOwner('test_user', 'changeme');
      const firstObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const { id: objectId1, type: type1 } = firstObject.body;
      expect(firstObject.body.accessControl).to.have.property('owner', objectOwnerProfileUid);

      const secondObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const { id: objectId2, type: type2 } = secondObject.body;
      expect(secondObject.body.accessControl).to.have.property('owner', objectOwnerProfileUid);

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
        .post('/access_control_objects/bulk_create?overwrite=true')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({
          objects,
        })
        .expect(200);
      for (const { id, accessControl } of res.body.saved_objects) {
        const object = objects.find((obj) => obj.id === id);
        expect(object).to.not.be(undefined);
        expect(accessControl).to.have.property('owner', objectOwnerProfileUid);
        expect(accessControl).to.have.property('accessMode', 'write_restricted');
      }
    });

    it('should allow overwriting objects owned by another user if admin', async () => {
      const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
        await loginAsObjectOwner('test_user', 'changeme');
      const firstObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const { id: objectId1, type: type1 } = firstObject.body;
      expect(firstObject.body.accessControl).to.have.property('owner', objectOwnerProfileUid);

      const secondObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const { id: objectId2, type: type2 } = secondObject.body;
      expect(secondObject.body.accessControl).to.have.property('owner', objectOwnerProfileUid);

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
        .post('/access_control_objects/bulk_create?overwrite=true')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({
          objects,
        })
        .expect(200);
      for (const { id, accessControl } of res.body.saved_objects) {
        const object = objects.find((obj) => obj.id === id);
        expect(object).to.not.be(undefined);
        expect(accessControl).to.have.property('owner', objectOwnerProfileUid);
        expect(accessControl).to.have.property('accessMode', 'write_restricted');
      }
    });

    it('should allow overwriting objects owned by another user if in default mode', async () => {
      const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin();

      const firstObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: false })
        .expect(200);
      const { id: objectId1, type: type1 } = firstObject.body;
      expect(firstObject.body.accessControl).to.have.property('owner', adminProfileUid);

      const secondObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: false })
        .expect(200);
      const { id: objectId2, type: type2 } = secondObject.body;
      expect(secondObject.body.accessControl).to.have.property('owner', adminProfileUid);

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

      const { cookie: notObjectOwnerCookieCookie } = await loginAsNotObjectOwner(
        'test_user',
        'changeme'
      );

      const res = await supertestWithoutAuth
        .post('/access_control_objects/bulk_create?overwrite=true')
        .set('kbn-xsrf', 'true')
        .set('cookie', notObjectOwnerCookieCookie.cookieString())
        .send({
          objects,
        })
        .expect(200);

      expect(res.body.saved_objects.length).to.be(2);
      expect(res.body.saved_objects[0].accessControl).to.have.property('owner', adminProfileUid);
      expect(res.body.saved_objects[0].accessControl).to.have.property('accessMode', 'default');
      expect(res.body.saved_objects[1].accessControl).to.have.property('owner', adminProfileUid);
      expect(res.body.saved_objects[1].accessControl).to.have.property('accessMode', 'default');
    });

    it('should reject when attempting to overwrite objects owned by another user if not admin', async () => {
      const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin();

      const firstObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const { id: objectId1, type: type1 } = firstObject.body;
      expect(firstObject.body.accessControl).to.have.property('owner', adminProfileUid);

      const secondObject = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const { id: objectId2, type: type2 } = secondObject.body;
      expect(secondObject.body.accessControl).to.have.property('owner', adminProfileUid);

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

      const { cookie: notObjectOwnerCookieCookie } = await loginAsNotObjectOwner(
        'test_user',
        'changeme'
      );

      const res = await supertestWithoutAuth
        .post('/access_control_objects/bulk_create?overwrite=true')
        .set('kbn-xsrf', 'true')
        .set('cookie', notObjectOwnerCookieCookie.cookieString())
        .send({
          objects,
        })
        .expect(403);

      expect(res.body).to.have.property('error', 'Forbidden');
      expect(res.body).to.have.property('message', `Unable to bulk_create ${ACCESS_CONTROL_TYPE}`);

      // ToDo: read back objects and confirm the owner has not changed
      const getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId1}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .expect(200);
      expect(getResponse.body.accessControl).to.have.property('owner', adminProfileUid);
      expect(getResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');

      const getResponse2 = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId2}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .expect(200);
      expect(getResponse2.body.accessControl).to.have.property('owner', adminProfileUid);
      expect(getResponse2.body.accessControl).to.have.property('accessMode', 'write_restricted');
    });
  });
}
