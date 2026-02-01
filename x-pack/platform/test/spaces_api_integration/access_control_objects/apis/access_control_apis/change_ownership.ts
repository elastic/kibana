/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ACCESS_CONTROL_TYPE,
  NON_ACCESS_CONTROL_TYPE,
} from '@kbn/access-control-test-plugin/server';
import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';

import {
  activateSimpleUserProfile,
  createSimpleUser,
  loginAsKibanaAdmin,
  loginAsNotObjectOwner,
  loginAsObjectOwner,
} from './utils/helpers';
import type { FtrProviderContext } from '../../../../functional/ftr_provider_context';

/**
 * Tests for the #change_ownership operation on access control saved objects.
 * Covers transferring ownership, bulk transfers, and permission checks.
 */
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('#change_ownership', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_savedobjects_editor']);
      await createSimpleUser(es);
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should transfer ownership of write-restricted objects by owner', async () => {
      const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile(es);

      const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
        supertestWithoutAuth,
        'test_user',
        'changeme'
      );

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

    describe('should reject', function () {
      this.tags('skipFIPS');

      it('should throw when transferring ownership of object owned by a different user and not admin', async () => {
        const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile(es);
        const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(
          supertestWithoutAuth
        );
        const createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        const objectId = createResponse.body.id;

        expect(createResponse.body.accessControl).to.have.property('owner', adminProfileUid);

        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner(
          supertestWithoutAuth,
          'test_user',
          'changeme'
        );
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
          `Access denied: Unable to manage access control for objects ${ACCESS_CONTROL_TYPE}:${objectId}`
        );
      });
    });

    it('should allow admins to transfer ownership of any object', async () => {
      const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile(es);
      const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
        supertestWithoutAuth,
        'test_user',
        'changeme'
      );
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const objectId = createResponse.body.id;

      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

      const { cookie: adminCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);
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
      const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile(es);
      const { cookie: ownerCookie } = await loginAsObjectOwner(
        supertestWithoutAuth,
        'test_user',
        'changeme'
      );
      const { cookie: adminCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);
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

    it('sets the default mode when setting the ownership of an object without access control metadata', async () => {
      const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile(es);

      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set(
          'Authorization',
          `Basic ${Buffer.from(`${adminTestUser.username}:${adminTestUser.password}`).toString(
            'base64'
          )}`
        )
        .send({ type: ACCESS_CONTROL_TYPE })
        .expect(200);
      const objectId = createResponse.body.id;

      expect(createResponse.body).not.to.have.property('accessControl');

      const { cookie: adminCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);

      let getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .expect(200);
      expect(getResponse.body).not.to.have.property('accessControl');

      await supertestWithoutAuth
        .put('/access_control_objects/change_owner')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({
          objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
          newOwnerProfileUid: simpleUserProfileUid,
        })
        .expect(200);

      getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .expect(200);

      expect(getResponse.body.accessControl).to.have.property('owner', simpleUserProfileUid);
      expect(getResponse.body.accessControl).to.have.property('accessMode', 'default');
    });

    it('should throw when transferring ownership of write-restricted objects if owner RBAC privileges are revoked', async () => {
      const { cookie: testUserCookie, profileUid: testUserProfileUid } = await loginAsObjectOwner(
        supertestWithoutAuth,
        'test_user',
        'changeme'
      );

      await createSimpleUser(es, ['kibana_savedobjects_editor']);
      const { cookie: ownerCookie, profileUid: ownerProfileUid } = await loginAsNotObjectOwner(
        supertestWithoutAuth,
        'simple_user',
        'changeme'
      );

      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.accessControl).to.have.property('owner', ownerProfileUid);

      // revoke privs
      await createSimpleUser(es, ['viewer']);

      // Verify owner
      const { cookie: adminCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);
      let getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .expect(200);
      expect(getResponse.body).to.have.property('accessControl');
      expect(getResponse.body.accessControl).to.have.property('owner', ownerProfileUid);

      const { cookie: revokedCookie, profileUid: revokedProfileUid } = await loginAsObjectOwner(
        supertestWithoutAuth,
        'simple_user',
        'changeme'
      );

      expect(ownerProfileUid).to.eql(revokedProfileUid);

      await supertestWithoutAuth
        .put('/access_control_objects/change_owner')
        .set('kbn-xsrf', 'true')
        .set('cookie', revokedCookie.cookieString())
        .send({
          objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
          newOwnerProfileUid: testUserProfileUid,
        })
        .expect(403);

      getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', testUserCookie.cookieString())
        .expect(200);
      expect(getResponse.body).to.have.property('accessControl');
      expect(getResponse.body.accessControl).to.have.property('owner', ownerProfileUid);
    });

    describe('partial bulk change ownership', () => {
      it('should allow bulk transfer ownership of allowed objects', async () => {
        const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile(es);
        const { cookie: ownerCookie } = await loginAsObjectOwner(
          supertestWithoutAuth,
          'test_user',
          'changeme'
        );
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
