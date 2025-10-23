/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parse as parseCookie } from 'tough-cookie';

import {
  ACCESS_CONTROL_TYPE,
  NON_ACCESS_CONTROL_TYPE,
} from '@kbn/access-control-test-plugin/server';
import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';

import type { FtrProviderContext } from '../../../../functional/ftr_provider_context';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core/packages/http/common';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
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

  const unownedObjectId = 'unowned_object_id';

  const createUnownedAccessControlObject = async () => {
    // Note: Using deprecated SO API to create an unowned object
    const res = await supertest
      .post(`/api/saved_objects/${ACCESS_CONTROL_TYPE}/${unownedObjectId}`)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'xxx')
      .send({ attributes: {} })
      .expect(200);
    return res.body.id;
  };

  const deleteUnownedAccessControlObject = async () => {
    await supertest
      .delete(`/api/saved_objects/${ACCESS_CONTROL_TYPE}/${unownedObjectId}`)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'xxx')
      .expect(200);
  };

  describe('#change_ownership', () => {
    after(async () => {
      await deleteUnownedAccessControlObject();
    });
    it('should transfer ownership of write-restricted objects by owner', async () => {
      const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile();

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
        .put('/access_control_objects/change_owner')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({
          objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
          newOwnerProfileUid: simpleUserProfileUid,
        })
        .expect(200);

      const getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .expect(200);
      expect(getResponse.body).to.have.property('accessControl');
      expect(getResponse.body.accessControl).to.have.property('owner', simpleUserProfileUid);
    });

    it('should throw when transferring ownership of object owned by a different user and not admin', async () => {
      const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile();
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
      const transferResponse = await supertestWithoutAuth
        .put('/access_control_objects/change_owner')
        .set('kbn-xsrf', 'true')
        .set('cookie', notOwnerCookie.cookieString())
        .send({
          objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
          newOwnerProfileUid: simpleUserProfileUid,
        })
        .expect(403);

      expect(transferResponse.body).to.have.property('message');
      expect(transferResponse.body.message).to.contain(
        `Access denied: Unable to manage access control for ${ACCESS_CONTROL_TYPE}`
      );
    });

    it('should allow admins to transfer ownership of any object', async () => {
      const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile();
      const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner('test_user', 'changeme');
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const objectId = createResponse.body.id;

      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

      const { cookie: adminCookie } = await loginAsKibanaAdmin();
      await supertestWithoutAuth
        .put('/access_control_objects/change_owner')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({
          objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
          newOwnerProfileUid: simpleUserProfileUid,
        })
        .expect(200);

      const getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .expect(200);

      expect(getResponse.body.accessControl).to.have.property('owner', simpleUserProfileUid);
    });

    it('should allow bulk transfer ownership of allowed objects', async () => {
      const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile();
      const { cookie: ownerCookie } = await loginAsObjectOwner('test_user', 'changeme');
      const { cookie: adminCookie } = await loginAsKibanaAdmin();
      const firstCreate = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const firstObjectId = firstCreate.body.id;

      const secondCreate = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const secondObjectId = secondCreate.body.id;

      await supertestWithoutAuth
        .put('/access_control_objects/change_owner')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({
          objects: [
            { id: firstObjectId, type: firstCreate.body.type },
            { id: secondObjectId, type: secondCreate.body.type },
          ],
          newOwnerProfileUid: simpleUserProfileUid,
        })
        .expect(200);
      {
        const getResponse = await supertestWithoutAuth
          .get(`/access_control_objects/${firstObjectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .expect(200);

        expect(getResponse.body.accessControl).to.have.property('owner', simpleUserProfileUid);
      }
      {
        const getResponse = await supertestWithoutAuth
          .get(`/access_control_objects/${secondObjectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .expect(200);
        expect(getResponse.body.accessControl).to.have.property('owner', simpleUserProfileUid);
      }
    });

    it('should allow admin to assign ownership of an unowned object', async () => {
      const { cookie: adminCookie } = await loginAsKibanaAdmin();
      const objectId = await createUnownedAccessControlObject();

      const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile();
      const transferResponse = await supertestWithoutAuth
        .put('/access_control_objects/change_owner')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({
          objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
          newOwnerProfileUid: simpleUserProfileUid,
        })
        .expect(200);
      expect(transferResponse.body.objects).to.have.length(1);

      const getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .expect(200);

      expect(getResponse.body.accessControl).to.have.property('owner', simpleUserProfileUid);
    });

    describe('partial bulk change ownership', () => {
      it('should allow bulk transfer ownership of allowed objects', async () => {
        const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile();
        const { cookie: ownerCookie } = await loginAsObjectOwner('test_user', 'changeme');
        const firstCreate = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        const firstObjectId = firstCreate.body.id;

        const secondCreate = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: NON_ACCESS_CONTROL_TYPE })
          .expect(200);
        const secondObjectId = secondCreate.body.id;

        const transferResponse = await supertestWithoutAuth
          .put('/access_control_objects/change_owner')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({
            objects: [
              { id: firstObjectId, type: firstCreate.body.type },
              { id: secondObjectId, type: secondCreate.body.type },
            ],
            newOwnerProfileUid: simpleUserProfileUid,
          })
          .expect(200);
        expect(transferResponse.body.objects).to.have.length(2);
        transferResponse.body.objects.forEach(
          (object: { id: string; type: string; error?: any }) => {
            if (object.type === ACCESS_CONTROL_TYPE) {
              expect(object).to.have.property('id', firstObjectId);
            }
            if (object.type === NON_ACCESS_CONTROL_TYPE) {
              expect(object).to.have.property('id', secondObjectId);
              expect(object).to.have.property('error');
              expect(object.error).to.have.property('output');
              expect(object.error.output).to.have.property('payload');
              expect(object.error.output.payload).to.have.property('message');
              expect(object.error.output.payload.message).to.contain(
                `The type ${NON_ACCESS_CONTROL_TYPE} does not support access control: Bad Request`
              );
            }
          }
        );
      });
    });
  });
}
