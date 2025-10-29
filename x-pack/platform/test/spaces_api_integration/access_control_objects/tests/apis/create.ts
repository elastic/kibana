/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACCESS_CONTROL_TYPE } from '@kbn/access-control-test-plugin/server';
import expect from '@kbn/expect';
import { adminTestUser } from '@kbn/test';

import { utils } from './utils';
import type { FtrProviderContext } from '../../../../functional/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const { loginAsKibanaAdmin, loginAsObjectOwner, loginAsNotObjectOwner } = utils(getService);

  describe('#create', () => {
    it('should create a write-restricted object', async () => {
      const { cookie: adminCookie, profileUid } = await loginAsKibanaAdmin();
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
    });

    it('should throw when trying to create an access control object with no user', async () => {
      const response = await supertest
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(400);
      expect(response.body).to.have.property('message');
      expect(response.body.message).to.contain(
        `Unable to create "write_restricted" "${ACCESS_CONTROL_TYPE}" saved object. User profile ID not found.: Bad Request`
      );
    });

    it('should allow overwriting an object owned by current user', async () => {
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

    it('should allow overwriting an object owned by another user if admin', async () => {
      const { cookie: objectOwnerCookie, profileUid: objectOnwerProfileUid } =
        await loginAsObjectOwner('test_user', 'changeme');
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

      const { cookie: adminCookie } = await loginAsKibanaAdmin();

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
      const { cookie: adminCookie, profileUid: adminUid } = await loginAsKibanaAdmin();
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

      const { cookie: otherUserCookie } = await loginAsNotObjectOwner('test_user', 'changeme');

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

    it('should reject when attempting to overwrite an object owned by another user if not admin', async () => {
      const { cookie: objectOwnerCookie, profileUid: adminUid } = await loginAsKibanaAdmin();
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(200);

      const objectId = createResponse.body.id;
      expect(createResponse.body.attributes).to.have.property('description', 'test');
      expect(createResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');
      expect(createResponse.body.accessControl).to.have.property('owner', adminUid);

      const { cookie: otherOwnerCookie } = await loginAsNotObjectOwner('test_user', 'changeme');

      const overwriteResponse = await supertestWithoutAuth
        .post('/access_control_objects/create?overwrite=true')
        .set('kbn-xsrf', 'true')
        .set('cookie', otherOwnerCookie.cookieString())
        .send({ id: objectId, type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
        .expect(403);

      expect(overwriteResponse.body).to.have.property('error', 'Forbidden');
      expect(overwriteResponse.body).to.have.property(
        'message',
        `Unable to create ${ACCESS_CONTROL_TYPE}`
      );
    });
  });
}
