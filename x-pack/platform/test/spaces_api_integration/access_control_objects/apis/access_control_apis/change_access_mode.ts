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
 * Tests for the #change_access_mode operation on access control saved objects.
 * Covers changing access modes, partial bulk changes, and permission checks.
 */
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('#change_access_mode', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_savedobjects_editor']);
      await createSimpleUser(es);
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should allow admins to change access mode of any object', async () => {
      const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
        supertestWithoutAuth,
        'test_user',
        'changeme'
      );
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: false })
        .expect(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

      const { cookie: adminCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);
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
      const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
        supertestWithoutAuth,
        'test_user',
        'changeme'
      );
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: false })
        .expect(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

      const { cookie: adminCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);
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

    it('should throw when trying to change access mode on write restrited objects when not owner', async () => {
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

      await activateSimpleUserProfile(es);
      const { cookie: notOwnerCookie } = await loginAsNotObjectOwner(
        supertestWithoutAuth,
        'simple_user',
        'changeme'
      );
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
        `Access denied: Unable to manage access control for objects ${ACCESS_CONTROL_TYPE}:${objectId}`
      );
    });

    it('allows updates by non-owner after removing write-restricted access mode', async () => {
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
        .put('/access_control_objects/change_access_mode')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({
          objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
          newAccessMode: 'default',
        })
        .expect(200);

      await createSimpleUser(es, ['kibana_savedobjects_editor']);
      const { cookie: notOwnerCookie } = await loginAsNotObjectOwner(
        supertestWithoutAuth,
        'simple_user',
        'changeme'
      );

      const updateResponse = await supertestWithoutAuth
        .put('/access_control_objects/update')
        .set('kbn-xsrf', 'true')
        .set('cookie', notOwnerCookie.cookieString())
        .send({ objectId, type: ACCESS_CONTROL_TYPE })
        .expect(200);
      expect(updateResponse.body.id).to.eql(objectId);
      expect(updateResponse.body.attributes).to.have.property('description', 'updated description');
    });

    it('sets the current user as the owner when setting the mode of an object without access control metadata', async () => {
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

      const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(
        supertestWithoutAuth
      );

      let getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .expect(200);
      expect(getResponse.body).not.to.have.property('accessControl');

      await supertestWithoutAuth
        .put('/access_control_objects/change_access_mode')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({
          objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
          newAccessMode: 'write_restricted',
        })
        .expect(200);

      getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .expect(200);

      expect(getResponse.body.accessControl).to.have.property('owner', adminProfileUid);
      expect(getResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');
    });

    it('should throw when trying to change access mode if owner RBAC privileges are revoked', async () => {
      const { cookie: testUserCookie } = await loginAsObjectOwner(
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
      expect(createResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');

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
        .put('/access_control_objects/change_access_mode')
        .set('kbn-xsrf', 'true')
        .set('cookie', revokedCookie.cookieString())
        .send({
          objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
          newAccessMode: 'default',
        })
        .expect(403);

      getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', testUserCookie.cookieString())
        .expect(200);
      expect(getResponse.body).to.have.property('accessControl');
      expect(getResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');
    });

    describe('partial bulk change access mode', () => {
      it('should allow change access mode of allowed objects', async () => {
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

        const respsetModeResponse = await supertestWithoutAuth
          .put('/access_control_objects/change_access_mode')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({
            objects: [
              { id: firstObjectId, type: firstCreate.body.type },
              { id: secondObjectId, type: secondCreate.body.type },
            ],
            newAccessMode: 'default',
          })
          .expect(200);
        expect(respsetModeResponse.body.objects).to.have.length(2);
        respsetModeResponse.body.objects.forEach(
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
