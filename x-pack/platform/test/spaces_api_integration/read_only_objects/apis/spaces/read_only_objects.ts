/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parse as parseCookie } from 'tough-cookie';

import expect from '@kbn/expect';
import { READ_ONLY_TYPE } from '@kbn/read-only-objects-test-plugin/server';
import { adminTestUser } from '@kbn/test';

import type { FtrProviderContext } from '../../../../functional/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

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

  describe('read only saved objects', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_savedobjects_editor']);
      await createSimpleUser();
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    describe('default state of read only objects', () => {
      it('types supporting access control are created with default access mode when not specified', async () => {
        const { cookie: adminCookie, profileUid } = await loginAsKibanaAdmin();
        const response = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: 'read_only_type' })
          .expect(200);
        expect(response.body).to.have.property('accessControl');
        expect(response.body.accessControl).to.have.property('accessMode', 'default');
        expect(response.body.accessControl).to.have.property('owner', profileUid);
      });
    });

    describe('#create', () => {
      it('should create a read only object', async () => {
        const { cookie: adminCookie, profileUid } = await loginAsKibanaAdmin();
        const response = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);

        expect(response.body.type).to.eql('read_only_type');
        expect(response.body).to.have.property('accessControl');

        const { accessControl } = response.body;
        expect(accessControl).to.have.property('accessMode');
        expect(accessControl).to.have.property('owner');

        const { owner, accessMode } = accessControl;
        expect(accessMode).to.be('read_only');
        expect(owner).to.be(profileUid);
      });

      it('creates objects that support access control without metadata when there is no active user profile', async () => {
        const response = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'xxxxx')
          .set(
            'Authorization',
            `Basic ${Buffer.from(`${adminTestUser.username}:${adminTestUser.password}`).toString(
              'base64'
            )}`
          )
          .send({ type: 'read_only_type' })
          .expect(200);
        expect(response.body).not.to.have.property('accessControl');
        expect(response.body).to.have.property('type');
        const { type } = response.body;
        expect(type).to.be('read_only_type');
      });

      it('should throw when trying to create read only object with no user', async () => {
        const response = await supertest
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(400);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.contain(
          'Unable to create "read_only" "read_only_type" saved object. User profile ID not found.: Bad Request'
        );
      });

      it('should allow overwriting an object owned by current user', async () => {
        const { cookie: objectOwnerCookie, profileUid } = await loginAsObjectOwner(
          'test_user',
          'changeme'
        );
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);

        const objectId = createResponse.body.id;
        expect(createResponse.body.attributes).to.have.property('description', 'test');
        {
          expect(createResponse.body).to.have.property('accessControl');

          const { accessControl } = createResponse.body;
          expect(accessControl).to.have.property('accessMode');
          expect(accessControl).to.have.property('owner');

          const { owner, accessMode } = accessControl;
          expect(accessMode).to.be('read_only');
          expect(owner).to.be(profileUid);
        }

        const overwriteResponse = await supertestWithoutAuth
          .post('/read_only_objects/create?overwrite=true')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ id: objectId, type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);

        const overwriteId = overwriteResponse.body.id;
        expect(createResponse.body).to.have.property('id', overwriteId);
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);
      });

      it('should allow overwriting an object owned by another user if admin', async () => {
        const { cookie: objectOwnerCookie, profileUid: objectOnwerProfileUid } =
          await loginAsObjectOwner('test_user', 'changeme');
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);

        const objectId = createResponse.body.id;
        expect(createResponse.body.attributes).to.have.property('description', 'test');
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(createResponse.body.accessControl).to.have.property('owner', objectOnwerProfileUid);

        const { cookie: adminCookie } = await loginAsKibanaAdmin();

        const overwriteResponse = await supertestWithoutAuth
          .post('/read_only_objects/create?overwrite=true')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ id: objectId, type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);

        const overwriteId = overwriteResponse.body.id;
        expect(createResponse.body).to.have.property('id', overwriteId);
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(createResponse.body.accessControl).to.have.property('owner', objectOnwerProfileUid);
      });

      it('should allow overwriting an object owned by another user if in default mode', async () => {
        const { cookie: adminCookie, profileUid: adminUid } = await loginAsKibanaAdmin();
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: READ_ONLY_TYPE, isReadOnly: false })
          .expect(200);

        const objectId = createResponse.body.id;
        expect(createResponse.body.attributes).to.have.property('description', 'test');
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'default');
        expect(createResponse.body.accessControl).to.have.property('owner', adminUid);

        const { cookie: otherUserCookie } = await loginAsNotObjectOwner('test_user', 'changeme');

        const overwriteResponse = await supertestWithoutAuth
          .post('/read_only_objects/create?overwrite=true')
          .set('kbn-xsrf', 'true')
          .set('cookie', otherUserCookie.cookieString())
          .send({
            id: objectId,
            type: READ_ONLY_TYPE,
            isReadOnly: true,
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
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);

        const objectId = createResponse.body.id;
        expect(createResponse.body.attributes).to.have.property('description', 'test');
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(createResponse.body.accessControl).to.have.property('owner', adminUid);

        const { cookie: otherOwnerCookie } = await loginAsNotObjectOwner('test_user', 'changeme');

        const overwriteResponse = await supertestWithoutAuth
          .post('/read_only_objects/create?overwrite=true')
          .set('kbn-xsrf', 'true')
          .set('cookie', otherOwnerCookie.cookieString())
          .send({ id: objectId, type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(403);

        expect(overwriteResponse.body).to.have.property('error', 'Forbidden');
        expect(overwriteResponse.body).to.have.property(
          'message',
          'Unable to create read_only_type'
        );
      });
    });

    describe('#bulk_create', () => {
      it('should create read only objects', async () => {
        const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
          await loginAsObjectOwner('test_user', 'changeme');

        const bulkCreateResponse = await supertestWithoutAuth
          .post('/read_only_objects/bulk_create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({
            objects: [
              { type: READ_ONLY_TYPE, isReadOnly: true },
              { type: READ_ONLY_TYPE, isReadOnly: true },
            ],
          });
        expect(bulkCreateResponse.body.saved_objects).to.have.length(2);
        for (const { accessControl } of bulkCreateResponse.body.saved_objects) {
          expect(accessControl).to.have.property('owner', objectOwnerProfileUid);
          expect(accessControl).to.have.property('accessMode', 'read_only');
        }
      });

      it('should allow overwriting objects owned by current user', async () => {
        const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
          await loginAsObjectOwner('test_user', 'changeme');
        const firstObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);
        const { id: objectId1, type: type1 } = firstObject.body;
        expect(firstObject.body.accessControl).to.have.property('owner', objectOwnerProfileUid);

        const secondObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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
          .post('/read_only_objects/bulk_create?overwrite=true')
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
          expect(accessControl).to.have.property('accessMode', 'read_only');
        }
      });

      it('should allow overwriting objects owned by another user if admin', async () => {
        const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
          await loginAsObjectOwner('test_user', 'changeme');
        const firstObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);
        const { id: objectId1, type: type1 } = firstObject.body;
        expect(firstObject.body.accessControl).to.have.property('owner', objectOwnerProfileUid);

        const secondObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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
          .post('/read_only_objects/bulk_create?overwrite=true')
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
          expect(accessControl).to.have.property('accessMode', 'read_only');
        }
      });

      it('should allow overwriting objects owned by another user if in default mode', async () => {
        const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin();

        const firstObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: READ_ONLY_TYPE, isReadOnly: false })
          .expect(200);
        const { id: objectId1, type: type1 } = firstObject.body;
        expect(firstObject.body.accessControl).to.have.property('owner', adminProfileUid);

        const secondObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: READ_ONLY_TYPE, isReadOnly: false })
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
          .post('/read_only_objects/bulk_create?overwrite=true')
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
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);
        const { id: objectId1, type: type1 } = firstObject.body;
        expect(firstObject.body.accessControl).to.have.property('owner', adminProfileUid);

        const secondObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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
          .post('/read_only_objects/bulk_create?overwrite=true')
          .set('kbn-xsrf', 'true')
          .set('cookie', notObjectOwnerCookieCookie.cookieString())
          .send({
            objects,
          })
          .expect(403);

        expect(res.body).to.have.property('error', 'Forbidden');
        expect(res.body).to.have.property('message', 'Unable to bulk_create read_only_type');

        // ToDo: read back objects and confirm the owner has not changed
        const getResponse = await supertestWithoutAuth
          .get(`/read_only_objects/${objectId1}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .expect(200);
        expect(getResponse.body.accessControl).to.have.property('owner', adminProfileUid);
        expect(getResponse.body.accessControl).to.have.property('accessMode', 'read_only');

        const getResponse2 = await supertestWithoutAuth
          .get(`/read_only_objects/${objectId2}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .expect(200);
        expect(getResponse2.body.accessControl).to.have.property('owner', adminProfileUid);
        expect(getResponse2.body.accessControl).to.have.property('accessMode', 'read_only');
      });
    });

    describe('#update', () => {
      it('should update read only objects owned by the same user', async () => {
        const { cookie: objectOwnerCookie, profileUid } = await loginAsObjectOwner(
          'test_user',
          'changeme'
        );
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);

        const objectId = createResponse.body.id;
        expect(createResponse.body.attributes).to.have.property('description', 'test');
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ objectId, type: 'read_only_type' })
          .expect(200);

        expect(updateResponse.body.id).to.eql(objectId);
        expect(updateResponse.body.attributes).to.have.property(
          'description',
          'updated description'
        );
      });

      it('should throw when updating read only objects owned by a different user when not admin', async () => {
        const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin();
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.attributes).to.have.property('description', 'test');
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(createResponse.body.accessControl).to.have.property('owner', adminProfileUid);

        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('test_user', 'changeme');
        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .send({ objectId, type: 'read_only_type' })
          .expect(403);
        expect(updateResponse.body).to.have.property('message');
        expect(updateResponse.body.message).to.contain('Unable to update read_only_type');
      });

      it('objects with default accessMode can be modified by non-owners', async () => {
        const { cookie: adminCookie } = await loginAsKibanaAdmin();
        const response = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: 'read_only_type' })
          .expect(200);
        const objectId = response.body.id;

        await createSimpleUser(['kibana_savedobjects_editor']);
        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('simple_user', 'changeme');
        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .send({ objectId, type: 'read_only_type' });

        expect(updateResponse.body.id).to.eql(objectId);
        expect(updateResponse.body.attributes).to.have.property(
          'description',
          'updated description'
        );
      });

      it('allows admin to update objects owned by different user', async () => {
        const { cookie: ownerCookie } = await loginAsObjectOwner('test_user', 'changeme');
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;

        const { cookie: adminCookie } = await loginAsKibanaAdmin();
        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ objectId, type: 'read_only_type' })
          .expect(200);

        expect(updateResponse.body.id).to.eql(objectId);
        expect(updateResponse.body.attributes).to.have.property(
          'description',
          'updated description'
        );
      });
    });

    describe('#bulk_update', () => {
      it('allow owner to bulk update objects marked as read only', async () => {
        const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
          await loginAsObjectOwner('test_user', 'changeme');
        const firstObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const { id: objectId1, type: type1 } = firstObject.body;

        const secondObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
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
          .post('/read_only_objects/bulk_update')
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
          expect(accessControl).to.have.property('accessMode', 'read_only');
        }
      });

      it('allow admin to bulk update objects marked as read only', async () => {
        const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
          await loginAsObjectOwner('test_user', 'changeme');
        const firstObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const { id: objectId1, type: type1 } = firstObject.body;

        const secondObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
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
          .post('/read_only_objects/bulk_update')
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
          expect(accessControl).to.have.property('accessMode', 'read_only');
        }
      });

      it('does not allow non-owner to bulk update objects marked as read only if not admin', async () => {
        await activateSimpleUserProfile();
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
        const firstObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const { id: objectId1, type: type1 } = firstObject.body;

        const secondObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
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
          .post('/read_only_objects/bulk_update')
          .set('kbn-xsrf', 'true')
          .set('cookie', nonOwnerCookie.cookieString())
          .send({
            objects,
          })
          .expect(403);
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.contain('Unable to bulk_update read_only_type');
      });

      it('allows non-owner non-admin to bulk update objects in default mode ', async () => {
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
        const firstObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: 'read_only_type' })
          .expect(200);
        const { id: objectId1, type: type1 } = firstObject.body;

        const secondObject = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: 'read_only_type' })
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
          .post('/read_only_objects/bulk_update')
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

    describe('#delete', () => {
      it('allow owner to delete object marked as read only', async () => {
        const { cookie: objectOwnerCookie, profileUid } = await loginAsObjectOwner(
          'test_user',
          'changeme'
        );
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        await supertestWithoutAuth
          .delete(`/read_only_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .expect(200);
      });

      it('allows admin to delete object marked as read only', async () => {
        const { cookie: objectOwnerCookie, profileUid } = await loginAsObjectOwner(
          'test_user',
          'changeme'
        );
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const { cookie: adminCookie } = await loginAsKibanaAdmin();
        await supertestWithoutAuth
          .delete(`/read_only_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .expect(200);

        const getResponse = await supertestWithoutAuth
          .get(`/read_only_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .expect(404);
        expect(getResponse.body).to.have.property('message');
        expect(getResponse.body.message).to.contain(
          `Saved object [read_only_type/${objectId}] not found`
        );
      });

      it('throws when trying to delete read only object owned by a different user when not admin', async () => {
        const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin();
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', adminProfileUid);

        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('test_user', 'changeme');
        const deleteResponse = await supertestWithoutAuth
          .delete(`/read_only_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .expect(403);
        expect(deleteResponse.body).to.have.property('message');
        expect(deleteResponse.body.message).to.contain(`Unable to delete read_only_type`);
      });

      it('allows non-owner to delete object in default mode', async () => {
        const { cookie: ownerCookie } = await loginAsKibanaAdmin();
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: 'read_only_type' })
          .expect(200);

        const objectId = createResponse.body.id;
        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('test_user', 'changeme');

        await supertestWithoutAuth
          .delete(`/read_only_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .expect(200);
      });
    });

    describe('#bulk_delete', () => {
      describe('bulk delete ownable objects', () => {
        it('allow owner to bulk delete objects marked as read only', async () => {
          const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
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
            .post('/read_only_objects/bulk_delete')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({
              objects,
            })
            .expect(200);

          for (const { id, success } of res.body.statuses) {
            const object = objects.find((obj) => obj.id === id);
            expect(object).to.not.be(undefined);
            expect(success).to.be(true);
          }
        });

        it('allow admin to bulk delete objects marked as read only', async () => {
          const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          const { id: objectId2, type: type2 } = secondObject.body;

          const { cookie: adminCookie } = await loginAsKibanaAdmin();

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
            .post('/read_only_objects/bulk_delete')
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .send({
              objects,
            })
            .expect(200);
          for (const { id, success } of res.body.statuses) {
            const object = objects.find((obj) => obj.id === id);
            expect(object).to.not.be(undefined);
            expect(success).to.be(true);
          }
        });

        it('does not allow non-owner to bulk delete objects marked as read only', async () => {
          await activateSimpleUserProfile();
          const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          const { id: objectId2, type: type2 } = secondObject.body;

          const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('simple_user', 'changeme');

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
            .post('/read_only_objects/bulk_delete')
            .set('kbn-xsrf', 'true')
            .set('cookie', notOwnerCookie.cookieString())
            .send({
              objects,
            })
            .expect(403);
          expect(res.body).to.have.property('message');
          expect(res.body.message).to.equal('Unable to bulk_delete read_only_type');
        });

        it('allows non-owner non-admin to bulk delete objects in default mode', async () => {
          const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');

          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: 'read_only_type' })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: 'read_only_type' })
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

          await supertestWithoutAuth
            .post('/read_only_objects/bulk_delete')
            .set('kbn-xsrf', 'true')
            .set('cookie', notOwnerCookie.cookieString())
            .send({ objects })
            .expect(200);

          await supertestWithoutAuth
            .get(`/read_only_objects/${objectId1}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', notOwnerCookie.cookieString())
            .expect(404);

          await supertestWithoutAuth
            .get(`/read_only_objects/${objectId2}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', notOwnerCookie.cookieString())
            .expect(404);
        });
      });

      describe('force bulk delete ownable objects', () => {
        it('allow owner to bulk delete objects marked as read only', async () => {
          const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
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
            .post('/read_only_objects/bulk_delete')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({
              objects,
              force: true,
            })
            .expect(200);

          for (const { id, success } of res.body.statuses) {
            const object = objects.find((obj) => obj.id === id);
            expect(object).to.not.be(undefined);
            expect(success).to.be(true);
          }
        });

        it('allow admin to bulk delete objects marked as read only', async () => {
          const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          const { id: objectId2, type: type2 } = secondObject.body;

          const { cookie: adminCookie } = await loginAsKibanaAdmin();

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
            .post('/read_only_objects/bulk_delete')
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .send({
              objects,
              force: true,
            })
            .expect(200);
          for (const { id, success } of res.body.statuses) {
            const object = objects.find((obj) => obj.id === id);
            expect(object).to.not.be(undefined);
            expect(success).to.be(true);
          }
        });
        it('does not allow non-owner to bulk delete objects marked as read only', async () => {
          await activateSimpleUserProfile();
          const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          const { id: objectId2, type: type2 } = secondObject.body;

          const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('simple_user', 'changeme');

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
            .post('/read_only_objects/bulk_delete')
            .set('kbn-xsrf', 'true')
            .set('cookie', notOwnerCookie.cookieString())
            .send({
              objects,
              force: true,
            })
            .expect(403);
          expect(res.body).to.have.property('message');
          expect(res.body.message).to.equal('Unable to bulk_delete read_only_type');
        });
      });
    });

    describe('#change_ownership', () => {
      it('should transfer ownership of read only objects by owner', async () => {
        const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile();

        const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
          'test_user',
          'changeme'
        );

        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        await supertestWithoutAuth
          .put('/read_only_objects/change_owner')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: 'read_only_type' }],
            newOwnerProfileUid: simpleUserProfileUid,
          })
          .expect(200);

        const getResponse = await supertestWithoutAuth
          .get(`/read_only_objects/${objectId}`)
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
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;

        expect(createResponse.body.accessControl).to.have.property('owner', adminProfileUid);

        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('test_user', 'changeme');
        const transferResponse = await supertestWithoutAuth
          .put('/read_only_objects/change_owner')
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: 'read_only_type' }],
            newOwnerProfileUid: simpleUserProfileUid,
          })
          .expect(403);

        expect(transferResponse.body).to.have.property('message');
        expect(transferResponse.body.message).to.contain(
          `Access denied: Unable to manage access control for read_only_type`
        );
      });

      it('should allow admins to transfer ownership of any object', async () => {
        const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile();
        const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
          'test_user',
          'changeme'
        );
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;

        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const { cookie: adminCookie } = await loginAsKibanaAdmin();
        await supertestWithoutAuth
          .put('/read_only_objects/change_owner')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: 'read_only_type' }],
            newOwnerProfileUid: simpleUserProfileUid,
          })
          .expect(200);

        const getResponse = await supertestWithoutAuth
          .get(`/read_only_objects/${objectId}`)
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
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const firstObjectId = firstCreate.body.id;

        const secondCreate = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const secondObjectId = secondCreate.body.id;

        await supertestWithoutAuth
          .put('/read_only_objects/change_owner')
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
            .get(`/read_only_objects/${firstObjectId}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .expect(200);

          expect(getResponse.body.accessControl).to.have.property('owner', simpleUserProfileUid);
        }
        {
          const getResponse = await supertestWithoutAuth
            .get(`/read_only_objects/${secondObjectId}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .expect(200);
          expect(getResponse.body.accessControl).to.have.property('owner', simpleUserProfileUid);
        }
      });

      describe('partial bulk change ownership', () => {
        it('should allow bulk transfer ownership of allowed objects', async () => {
          const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile();
          const { cookie: ownerCookie } = await loginAsObjectOwner('test_user', 'changeme');
          const firstCreate = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', ownerCookie.cookieString())
            .send({ type: 'read_only_type', isReadOnly: true })
            .expect(200);
          const firstObjectId = firstCreate.body.id;

          const secondCreate = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', ownerCookie.cookieString())
            .send({ type: 'non_read_only_type' })
            .expect(200);
          const secondObjectId = secondCreate.body.id;

          const transferResponse = await supertestWithoutAuth
            .put('/read_only_objects/change_owner')
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
              if (object.type === 'read_only_type') {
                expect(object).to.have.property('id', firstObjectId);
              }
              if (object.type === 'non_read_only_type') {
                expect(object).to.have.property('id', secondObjectId);
                expect(object).to.have.property('error');
                expect(object.error).to.have.property('output');
                expect(object.error.output).to.have.property('payload');
                expect(object.error.output.payload).to.have.property('message');
                expect(object.error.output.payload.message).to.contain(
                  `The type non_read_only_type does not support access control: Bad Request`
                );
              }
            }
          );
        });
      });
    });

    describe('#change_access_mode', () => {
      it('should allow admins to change access mode of any object', async () => {
        const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
          'test_user',
          'changeme'
        );
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: false })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const { cookie: adminCookie } = await loginAsKibanaAdmin();
        const response = await supertestWithoutAuth
          .put('/read_only_objects/change_access_mode')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: 'read_only_type' }],
            newAccessMode: 'read_only',
          })
          .expect(200);
        expect(response.body.objects).to.have.length(1);
        expect(response.body.objects[0].id).to.eql(objectId);
        expect(response.body.objects[0].type).to.eql('read_only_type');

        const getResponse = await supertestWithoutAuth
          .get(`/read_only_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .expect(200);

        expect(getResponse.body.accessControl).to.have.property('accessMode', 'read_only');
      });

      it('allow owner to update object data after access mode change', async () => {
        const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
          'test_user',
          'changeme'
        );
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: false })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const { cookie: adminCookie } = await loginAsKibanaAdmin();
        const response = await supertestWithoutAuth
          .put('/read_only_objects/change_access_mode')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: 'read_only_type' }],
            newAccessMode: 'read_only',
          })
          .expect(200);
        expect(response.body.objects).to.have.length(1);
        expect(response.body.objects[0].id).to.eql(objectId);
        expect(response.body.objects[0].type).to.eql('read_only_type');

        const getResponse = await supertestWithoutAuth
          .get(`/read_only_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .expect(200);

        expect(getResponse.body.accessControl).to.have.property('accessMode', 'read_only');

        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ objectId, type: 'read_only_type' })
          .expect(200);
        expect(updateResponse.body.id).to.eql(objectId);
        expect(updateResponse.body.attributes).to.have.property(
          'description',
          'updated description'
        );
      });

      it('should throw when trying to change access mode on locked objects when not owner', async () => {
        const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
          'test_user',
          'changeme'
        );
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);

        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        await activateSimpleUserProfile();
        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('simple_user', 'changeme');
        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/change_access_mode')
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: 'read_only_type' }],
            newAccessMode: 'read_only',
          })
          .expect(403);
        expect(updateResponse.body).to.have.property('message');
        expect(updateResponse.body.message).to.contain(
          `Access denied: Unable to manage access control for read_only_type`
        );
      });

      it('allows updates by non-owner after removing read only access mode', async () => {
        const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
          'test_user',
          'changeme'
        );
        const createResponse = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: 'read_only_type', isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        await supertestWithoutAuth
          .put('/read_only_objects/change_access_mode')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: 'read_only_type' }],
            newAccessMode: 'default',
          })
          .expect(200);

        await createSimpleUser(['kibana_savedobjects_editor']);
        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('simple_user', 'changeme');

        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .send({ objectId, type: 'read_only_type' })
          .expect(200);
        expect(updateResponse.body.id).to.eql(objectId);
        expect(updateResponse.body.attributes).to.have.property(
          'description',
          'updated description'
        );
      });
    });
  });
}
