/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACCESS_CONTROL_TYPE } from '@kbn/access-control-test-plugin/server';
import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';

import {
  createSimpleUser,
  loginAsKibanaAdmin,
  loginAsNotObjectOwner,
  loginAsObjectOwner,
} from './utils/helpers';
import type { FtrProviderContext } from '../../../../functional/ftr_provider_context';

/**
 * Tests for the #create operation on access control saved objects.
 * Covers creating write-restricted objects, overwriting, and permission checks.
 */
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('#create', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_savedobjects_editor']);
      await createSimpleUser(es);
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should create a write-restricted object', async () => {
      const { cookie: adminCookie, profileUid } = await loginAsKibanaAdmin(supertestWithoutAuth);
      const response = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);

      expect(response.body.type).to.eql(ACCESS_CONTROL_TYPE);
      expect(response.body).to.have.property('accessControl');

      const { accessControl } = response.body;
      expect(accessControl).to.have.property('accessMode');
      expect(accessControl).to.have.property('owner');

      const { owner, accessMode } = accessControl;
      expect(accessMode).to.be('write_restricted');
      expect(owner).to.be(profileUid);
    });

    it('creates objects that support access control without metadata when there is no active user profile', async () => {
      const response = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'xxxxx')
        .set(
          'Authorization',
          `Basic ${Buffer.from(`${adminTestUser.username}:${adminTestUser.password}`).toString(
            'base64'
          )}`
        )
        .send({ type: ACCESS_CONTROL_TYPE })
        .expect(200);
      expect(response.body).not.to.have.property('accessControl');
      expect(response.body).to.have.property('type');
      const { type } = response.body;
      expect(type).to.be(ACCESS_CONTROL_TYPE);
      const { id: createdId } = response.body;

      const getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${createdId}`)
        .set('kbn-xsrf', 'true')
        .set(
          'Authorization',
          `Basic ${Buffer.from(`${adminTestUser.username}:${adminTestUser.password}`).toString(
            'base64'
          )}`
        )
        .expect(200);
      expect(getResponse.body).not.to.have.property('accessControl');
    });

    it('allows creating an object supporting access control with no access control metadata when there is no active user profile and no access mode is provided', async () => {
      const response = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'xxxxx')
        .set(
          'Authorization',
          `Basic ${Buffer.from(`${adminTestUser.username}:${adminTestUser.password}`).toString(
            'base64'
          )}`
        )

        .send({ type: ACCESS_CONTROL_TYPE })
        .expect(200);

      // Verify the response does not contain accessControl metadata
      expect(response.body).not.to.have.property('accessControl');
      expect(response.body).to.have.property('type', ACCESS_CONTROL_TYPE);

      const { id: createdId } = response.body;

      // Verify via GET that the persisted object also has no accessControl metadata
      const getResponse = await supertestWithoutAuth
        .get(`/access_control_objects/${createdId}`)
        .set('kbn-xsrf', 'true')
        .set(
          'Authorization',
          `Basic ${Buffer.from(`${adminTestUser.username}:${adminTestUser.password}`).toString(
            'base64'
          )}`
        )
        .expect(200);

      expect(getResponse.body).not.to.have.property('accessControl');
      expect(getResponse.body).to.have.property('id', createdId);
      expect(getResponse.body).to.have.property('type', ACCESS_CONTROL_TYPE);
    });

    it('should throw when trying to create an access control object with no user', async () => {
      const response = await supertest
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(400);
      expect(response.body).to.have.property('message');
      expect(response.body.message).to.contain(
        `Cannot create a saved object of type ${ACCESS_CONTROL_TYPE} with an access mode because Kibana could not determine the user profile ID for the caller. Access control requires an identifiable user profile: Bad Request`
      );
    });

    it('should allow overwriting an object owned by current user', async () => {
      const { cookie: objectOwnerCookie, profileUid } = await loginAsObjectOwner(
        supertestWithoutAuth,
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
      {
        expect(createResponse.body).to.have.property('accessControl');

        const { accessControl } = createResponse.body;
        expect(accessControl).to.have.property('accessMode');
        expect(accessControl).to.have.property('owner');

        const { owner, accessMode } = accessControl;
        expect(accessMode).to.be('write_restricted');
        expect(owner).to.be(profileUid);
      }

      const overwriteResponse = await supertestWithoutAuth
        .post('/access_control_objects/create?overwrite=true')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ id: objectId, type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);

      const overwriteId = overwriteResponse.body.id;
      expect(createResponse.body).to.have.property('id', overwriteId);
      expect(createResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');
      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);
    });

    it('should throw when overwriting an object owned by current user if RBAC privileges are revoked', async () => {
      await createSimpleUser(es, ['kibana_savedobjects_editor']);
      const { cookie: ownerCookie, profileUid: ownerProfileUid } = await loginAsObjectOwner(
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
      expect(createResponse.body.attributes).to.have.property('description', 'test');
      expect(createResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');
      expect(createResponse.body.accessControl).to.have.property('owner', ownerProfileUid);

      // revoke privs
      await createSimpleUser(es, ['viewer']);

      // Verify owner
      const { cookie: adminCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);
      const getResponse = await supertestWithoutAuth
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

      const overwriteResponse = await supertestWithoutAuth
        .post('/access_control_objects/create?overwrite=true')
        .set('kbn-xsrf', 'true')
        .set('cookie', revokedCookie.cookieString())
        .send({ id: objectId, type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(403);

      expect(overwriteResponse.body).to.have.property('error', 'Forbidden');
      expect(overwriteResponse.body).to.have.property(
        'message',
        `Unable to create ${ACCESS_CONTROL_TYPE}`
      );
    });

    it('should allow overwriting an object owned by another user if admin', async () => {
      const { cookie: objectOwnerCookie, profileUid: objectOnwerProfileUid } =
        await loginAsObjectOwner(supertestWithoutAuth, 'test_user', 'changeme');
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);

      const objectId = createResponse.body.id;
      expect(createResponse.body.attributes).to.have.property('description', 'test');
      expect(createResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');
      expect(createResponse.body.accessControl).to.have.property('owner', objectOnwerProfileUid);

      const { cookie: adminCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);

      const overwriteResponse = await supertestWithoutAuth
        .post('/access_control_objects/create?overwrite=true')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({ id: objectId, type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);

      const overwriteId = overwriteResponse.body.id;
      expect(createResponse.body).to.have.property('id', overwriteId);
      expect(createResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');
      expect(createResponse.body.accessControl).to.have.property('owner', objectOnwerProfileUid);
    });

    it('should allow overwriting an object owned by another user if in default mode', async () => {
      const { cookie: adminCookie, profileUid: adminUid } = await loginAsKibanaAdmin(
        supertestWithoutAuth
      );
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: false })
        .expect(200);

      const objectId = createResponse.body.id;
      expect(createResponse.body.attributes).to.have.property('description', 'test');
      expect(createResponse.body.accessControl).to.have.property('accessMode', 'default');
      expect(createResponse.body.accessControl).to.have.property('owner', adminUid);

      const { cookie: otherUserCookie } = await loginAsNotObjectOwner(
        supertestWithoutAuth,
        'test_user',
        'changeme'
      );

      const overwriteResponse = await supertestWithoutAuth
        .post('/access_control_objects/create?overwrite=true')
        .set('kbn-xsrf', 'true')
        .set('cookie', otherUserCookie.cookieString())
        .send({
          id: objectId,
          type: ACCESS_CONTROL_TYPE,
          isWriteRestricted: true,
          // description: 'overwritten', ToDo: support this in test plugin
        })
        .expect(200);

      const overwriteId = overwriteResponse.body.id;
      expect(createResponse.body).to.have.property('id', overwriteId);
      // expect(createResponse.body.attributes).to.have.property('description', 'test');
      expect(createResponse.body.accessControl).to.have.property('accessMode', 'default'); // cannot overwrite mode
      expect(createResponse.body.accessControl).to.have.property('owner', adminUid);
    });

    describe('should reject', function () {
      this.tags('skipFIPS');

      it('when attempting to overwrite an object owned by another user if not admin', async () => {
        const { cookie: objectOwnerCookie, profileUid: adminUid } = await loginAsKibanaAdmin(
          supertestWithoutAuth
        );
        const createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);

        const objectId = createResponse.body.id;
        expect(createResponse.body.attributes).to.have.property('description', 'test');
        expect(createResponse.body.accessControl).to.have.property(
          'accessMode',
          'write_restricted'
        );
        expect(createResponse.body.accessControl).to.have.property('owner', adminUid);

        const { cookie: otherOwnerCookie } = await loginAsNotObjectOwner(
          supertestWithoutAuth,
          'test_user',
          'changeme'
        );

        const overwriteResponse = await supertestWithoutAuth
          .post('/access_control_objects/create?overwrite=true')
          .set('kbn-xsrf', 'true')
          .set('cookie', otherOwnerCookie.cookieString())
          .send({ id: objectId, type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(403);

        expect(overwriteResponse.body).to.have.property('error', 'Forbidden');
        expect(overwriteResponse.body).to.have.property('message');
        expect(overwriteResponse.body.message).to.contain(
          `The "manage_access_control" privilege is required to affect write restricted objects owned by another user.`
        );
        expect(overwriteResponse.body.message).to.contain(`${ACCESS_CONTROL_TYPE}:${objectId}`);
      });
    });
  });
}
