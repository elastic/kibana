/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';

import expect from '@kbn/expect';
import { NON_READ_ONLY_TYPE, READ_ONLY_TYPE } from '@kbn/read-only-objects-test-plugin/server';
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
          .send({ type: READ_ONLY_TYPE })
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
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);

        expect(response.body.type).to.eql(READ_ONLY_TYPE);
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
          .send({ type: READ_ONLY_TYPE })
          .expect(200);
        expect(response.body).not.to.have.property('accessControl');
        expect(response.body).to.have.property('type');
        const { type } = response.body;
        expect(type).to.be(READ_ONLY_TYPE);
      });

      it('should throw when trying to create read only object with no user', async () => {
        const response = await supertest
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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
          `Unable to create read_only_type, access control restrictions for read_only_type:${objectId}`
        );
      });
    });

    describe('#bulk_create', () => {
      describe('success', () => {
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

        it('allows owner to overwrite objects they own', async () => {
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

        it('allows non-owner to overwrite objects in default mode', async () => {
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
          expect(res.body.saved_objects[0].accessControl).to.have.property(
            'owner',
            adminProfileUid
          );
          expect(res.body.saved_objects[0].accessControl).to.have.property('accessMode', 'default');
          expect(res.body.saved_objects[1].accessControl).to.have.property(
            'owner',
            adminProfileUid
          );
          expect(res.body.saved_objects[1].accessControl).to.have.property('accessMode', 'default');
        });

        it('allows admin to overwrite objects they do not own', async () => {
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
      });

      describe('failure modes', () => {
        it('rejects when overwriting and all objects are read-only and inaccessible', async () => {
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
          expect(res.body).to.have.property('message');
          expect(res.body.message).to.contain(
            `Unable to bulk_create read_only_type, access control restrictions for`
          );
          expect(res.body.message).to.contain(`read_only_type:${objectId1}`); // order is not guaranteed
          expect(res.body.message).to.contain(`read_only_type:${objectId2}`);

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

        it('return status when overwriting objects and all objects are read-only but some are owned by current user', async () => {
          const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin();

          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;
          expect(firstObject.body).to.have.property('accessControl');
          expect(firstObject.body.accessControl).to.have.property('owner', adminProfileUid);

          const { cookie: notObjectOwnerCookieCookie, profileUid: nonAdminProfileUid } =
            await loginAsNotObjectOwner('test_user', 'changeme');

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', notObjectOwnerCookieCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const { id: objectId2, type: type2 } = secondObject.body;
          expect(secondObject.body).to.have.property('accessControl');
          expect(secondObject.body.accessControl).to.have.property('owner', nonAdminProfileUid);

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
            .set('cookie', notObjectOwnerCookieCookie.cookieString())
            .send({
              objects,
            })
            .expect(200);

          expect(res.body).to.have.property('saved_objects');
          expect(res.body.saved_objects).to.be.an('array');
          expect(res.body.saved_objects).to.have.length(2);
          expect(res.body.saved_objects[0]).to.eql({
            id: objectId1,
            type: READ_ONLY_TYPE,
            error: {
              statusCode: 403,
              error: 'Forbidden',
              message:
                'Overwriting objects in read-only mode that are owned by another user requires the manage_access_control privilege.',
            },
          });
          expect(res.body.saved_objects[1]).to.have.property('type', READ_ONLY_TYPE);
          expect(res.body.saved_objects[1]).to.have.property('id', objectId2);
          expect(res.body.saved_objects[1]).not.to.have.property('error');
        });

        it('return status when overwriting objects and some objects are in default mode', async () => {
          const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin();

          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;
          expect(firstObject.body).to.have.property('accessControl');
          expect(firstObject.body.accessControl).to.have.property('owner', adminProfileUid);

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: false })
            .expect(200);
          const { id: objectId2, type: type2 } = secondObject.body;
          expect(secondObject.body).to.have.property('accessControl');
          expect(secondObject.body.accessControl).to.have.property('owner', adminProfileUid);

          const { cookie: notObjectOwnerCookieCookie } = await loginAsNotObjectOwner(
            'test_user',
            'changeme'
          );

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
            .set('cookie', notObjectOwnerCookieCookie.cookieString())
            .send({
              objects,
            })
            .expect(200);

          expect(res.body).to.have.property('saved_objects');
          expect(res.body.saved_objects).to.be.an('array');
          expect(res.body.saved_objects).to.have.length(2);
          expect(res.body.saved_objects[0]).to.eql({
            id: objectId1,
            type: READ_ONLY_TYPE,
            error: {
              statusCode: 403,
              error: 'Forbidden',
              message:
                'Overwriting objects in read-only mode that are owned by another user requires the manage_access_control privilege.',
            },
          });
          expect(res.body.saved_objects[1]).to.have.property('type', READ_ONLY_TYPE);
          expect(res.body.saved_objects[1]).to.have.property('id', objectId2);
          expect(res.body.saved_objects[1]).not.to.have.property('error');
        });

        it('return stauts when overwriting and some authorized types do not support access control', async () => {
          const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin();

          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;
          expect(firstObject.body).to.have.property('accessControl');
          expect(firstObject.body.accessControl).to.have.property('owner', adminProfileUid);

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', adminCookie.cookieString())
            .send({ type: NON_READ_ONLY_TYPE })
            .expect(200);
          const { id: objectId2, type: type2 } = secondObject.body;
          expect(secondObject.body).not.to.have.property('accessControl');

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

          expect(res.body).to.have.property('saved_objects');
          expect(res.body.saved_objects).to.be.an('array');
          expect(res.body.saved_objects).to.have.length(2);
          expect(res.body.saved_objects[0]).to.eql({
            id: objectId1,
            type: READ_ONLY_TYPE,
            error: {
              statusCode: 403,
              error: 'Forbidden',
              message:
                'Overwriting objects in read-only mode that are owned by another user requires the manage_access_control privilege.',
            },
          });
          expect(res.body.saved_objects[1]).to.have.property('type', NON_READ_ONLY_TYPE);
          expect(res.body.saved_objects[1]).to.have.property('id', objectId2);
          expect(res.body.saved_objects[1]).not.to.have.property('error');
        });
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
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);

        const objectId = createResponse.body.id;
        expect(createResponse.body.attributes).to.have.property('description', 'test');
        expect(createResponse.body.accessControl).to.have.property('accessMode', 'read_only');
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ objectId, type: READ_ONLY_TYPE })
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
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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
          .send({ objectId, type: READ_ONLY_TYPE })
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
          .send({ type: READ_ONLY_TYPE })
          .expect(200);
        const objectId = response.body.id;

        await createSimpleUser(['kibana_savedobjects_editor']);
        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('simple_user', 'changeme');
        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .send({ objectId, type: READ_ONLY_TYPE });

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
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;

        const { cookie: adminCookie } = await loginAsKibanaAdmin();
        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ objectId, type: READ_ONLY_TYPE })
          .expect(200);

        expect(updateResponse.body.id).to.eql(objectId);
        expect(updateResponse.body.attributes).to.have.property(
          'description',
          'updated description'
        );
      });
    });

    describe('#bulk_update', () => {
      describe('success', () => {
        it('allows owner to bulk update objects marked as read only', async () => {
          const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
            await loginAsObjectOwner('test_user', 'changeme');
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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

        it('allows admin to bulk update objects marked as read only', async () => {
          const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
            await loginAsObjectOwner('test_user', 'changeme');
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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

        it('allows non-owner non-admin to bulk update objects in default mode ', async () => {
          const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE })
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

      describe('failuere modes', () => {
        it('rejects if all objects are read-only and inaccessible', async () => {
          await activateSimpleUserProfile();
          const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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

        it('returns status if all objects are read-only but some are owned by the current user', async () => {
          await activateSimpleUserProfile();
          const { cookie: object1OwnerCookie, profileUid: obj1OwnerId } = await loginAsObjectOwner(
            'test_user',
            'changeme'
          );
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', object1OwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;
          expect(firstObject.body).to.have.property('accessControl');
          expect(firstObject.body.accessControl).to.have.property('owner', obj1OwnerId);
          expect(firstObject.body.accessControl).to.have.property('accessMode', 'read_only');

          await createSimpleUser(['kibana_savedobjects_editor']);
          const { cookie: object2OwnerCookie, profileUid: obj2OwnerId } =
            await loginAsNotObjectOwner('simple_user', 'changeme');

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', object2OwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const { id: objectId2, type: type2 } = secondObject.body;
          expect(secondObject.body).to.have.property('accessControl');
          expect(secondObject.body.accessControl).to.have.property('owner', obj2OwnerId);
          expect(secondObject.body.accessControl).to.have.property('accessMode', 'read_only');

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
            .set('cookie', object2OwnerCookie.cookieString())
            .send({
              objects,
            })
            .expect(200);

          expect(res.body).to.have.property('saved_objects');
          expect(res.body.saved_objects).to.be.an('array');
          expect(res.body.saved_objects).to.have.length(2);
          expect(res.body.saved_objects[0]).to.eql({
            id: objectId1,
            type: READ_ONLY_TYPE,
            error: {
              statusCode: 403,
              error: 'Forbidden',
              message:
                'Updating objects in read-only mode that are owned by another user requires the manage_access_control privilege.',
            },
          });
          expect(res.body.saved_objects[1]).to.have.property('id', objectId2);
          expect(res.body.saved_objects[1]).to.have.property('type', type2);
          expect(res.body.saved_objects[1]).to.have.property('updated_by', obj2OwnerId);
          expect(res.body.saved_objects[1]).not.to.have.property('error');
        });

        it('returns status if some objects are in default mode', async () => {
          await activateSimpleUserProfile();
          const { cookie: object1OwnerCookie, profileUid: obj1OwnerId } = await loginAsObjectOwner(
            'test_user',
            'changeme'
          );
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', object1OwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;
          expect(firstObject.body).to.have.property('accessControl');
          expect(firstObject.body.accessControl).to.have.property('owner', obj1OwnerId);
          expect(firstObject.body.accessControl).to.have.property('accessMode', 'read_only');

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', object1OwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: false })
            .expect(200);
          const { id: objectId2, type: type2 } = secondObject.body;
          expect(secondObject.body).to.have.property('accessControl');
          expect(secondObject.body.accessControl).to.have.property('owner', obj1OwnerId);
          expect(secondObject.body.accessControl).to.have.property('accessMode', 'default');

          await createSimpleUser(['kibana_savedobjects_editor']);
          const { cookie: object2OwnerCookie, profileUid: obj2OwnerId } =
            await loginAsNotObjectOwner('simple_user', 'changeme');

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
            .set('cookie', object2OwnerCookie.cookieString())
            .send({
              objects,
            })
            .expect(200);

          expect(res.body).to.have.property('saved_objects');
          expect(res.body.saved_objects).to.be.an('array');
          expect(res.body.saved_objects).to.have.length(2);
          expect(res.body.saved_objects[0]).to.eql({
            id: objectId1,
            type: READ_ONLY_TYPE,
            error: {
              statusCode: 403,
              error: 'Forbidden',
              message:
                'Updating objects in read-only mode that are owned by another user requires the manage_access_control privilege.',
            },
          });
          expect(res.body.saved_objects[1]).to.have.property('id', objectId2);
          expect(res.body.saved_objects[1]).to.have.property('type', type2);
          expect(res.body.saved_objects[1]).to.have.property('updated_by', obj2OwnerId);
          expect(res.body.saved_objects[1]).not.to.have.property('error');
        });

        it('returns status if some authorized types do not support access control', async () => {
          await activateSimpleUserProfile();
          const { cookie: object1OwnerCookie, profileUid: obj1OwnerId } = await loginAsObjectOwner(
            'test_user',
            'changeme'
          );
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', object1OwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;
          expect(firstObject.body).to.have.property('accessControl');
          expect(firstObject.body.accessControl).to.have.property('owner', obj1OwnerId);
          expect(firstObject.body.accessControl).to.have.property('accessMode', 'read_only');

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', object1OwnerCookie.cookieString())
            .send({ type: NON_READ_ONLY_TYPE })
            .expect(200);
          const { id: objectId2, type: type2 } = secondObject.body;
          expect(secondObject.body).not.to.have.property('accessControl');

          await createSimpleUser(['kibana_savedobjects_editor']);
          const { cookie: object2OwnerCookie, profileUid: obj2OwnerId } =
            await loginAsNotObjectOwner('simple_user', 'changeme');

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
            .set('cookie', object2OwnerCookie.cookieString())
            .send({
              objects,
            })
            .expect(200);

          expect(res.body).to.have.property('saved_objects');
          expect(res.body.saved_objects).to.be.an('array');
          expect(res.body.saved_objects).to.have.length(2);
          expect(res.body.saved_objects[0]).to.eql({
            id: objectId1,
            type: READ_ONLY_TYPE,
            error: {
              statusCode: 403,
              error: 'Forbidden',
              message:
                'Updating objects in read-only mode that are owned by another user requires the manage_access_control privilege.',
            },
          });
          expect(res.body.saved_objects[1]).to.have.property('id', objectId2);
          expect(res.body.saved_objects[1]).to.have.property('type', type2);
          expect(res.body.saved_objects[1]).to.have.property('updated_by', obj2OwnerId);
          expect(res.body.saved_objects[1]).not.to.have.property('error');
        });
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
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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
          .send({ type: READ_ONLY_TYPE })
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
        describe('success', () => {
          it('allows owner to bulk delete objects in read-only mode', async () => {
            const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
            const firstObject = await supertestWithoutAuth
              .post('/read_only_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: READ_ONLY_TYPE, isReadOnly: true })
              .expect(200);
            const { id: objectId1, type: type1 } = firstObject.body;

            const secondObject = await supertestWithoutAuth
              .post('/read_only_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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

          it('allows non-owner to bulk delete objects in default mode', async () => {
            const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');

            const firstObject = await supertestWithoutAuth
              .post('/read_only_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: READ_ONLY_TYPE })
              .expect(200);
            const { id: objectId1, type: type1 } = firstObject.body;

            const secondObject = await supertestWithoutAuth
              .post('/read_only_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: READ_ONLY_TYPE })
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
            const { cookie: notOwnerCookie } = await loginAsNotObjectOwner(
              'simple_user',
              'changeme'
            );

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

          it('allows admin to bulk delete objects they do not own', async () => {
            const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
            const firstObject = await supertestWithoutAuth
              .post('/read_only_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: READ_ONLY_TYPE, isReadOnly: true })
              .expect(200);
            const { id: objectId1, type: type1 } = firstObject.body;

            const secondObject = await supertestWithoutAuth
              .post('/read_only_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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
        });

        describe('failure modes', () => {
          it('rejects if all objects are read-only and inaccessible', async () => {
            const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
            const firstObject = await supertestWithoutAuth
              .post('/read_only_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: READ_ONLY_TYPE, isReadOnly: true })
              .expect(200);
            const { id: objectId1, type: type1 } = firstObject.body;

            const secondObject = await supertestWithoutAuth
              .post('/read_only_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: READ_ONLY_TYPE, isReadOnly: true })
              .expect(200);
            const { id: objectId2, type: type2 } = secondObject.body;

            await createSimpleUser(['kibana_savedobjects_editor']);
            const { cookie: notOwnerCookie } = await loginAsNotObjectOwner(
              'simple_user',
              'changeme'
            );

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
            expect(res.body.message).to.contain(
              `Unable to bulk_delete read_only_type, access control restrictions for`
            );
            expect(res.body.message).to.contain(`read_only_type:${objectId1}`); // order is not guaranteed
            expect(res.body.message).to.contain(`read_only_type:${objectId2}`);
          });

          it('returns status if all objects are read-only but some objects are owned by the current user', async () => {
            await activateSimpleUserProfile();
            const { cookie: object1OwnerCookie, profileUid: obj1OwnerId } =
              await loginAsObjectOwner('test_user', 'changeme');
            const firstObject = await supertestWithoutAuth
              .post('/read_only_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', object1OwnerCookie.cookieString())
              .send({ type: READ_ONLY_TYPE, isReadOnly: true })
              .expect(200);
            const { id: objectId1, type: type1 } = firstObject.body;
            expect(firstObject.body).to.have.property('accessControl');
            expect(firstObject.body.accessControl).to.have.property('owner', obj1OwnerId);
            expect(firstObject.body.accessControl).to.have.property('accessMode', 'read_only');

            await createSimpleUser(['kibana_savedobjects_editor']);
            const { cookie: object2OwnerCookie, profileUid: obj2OwnerId } =
              await loginAsNotObjectOwner('simple_user', 'changeme');

            const secondObject = await supertestWithoutAuth
              .post('/read_only_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', object2OwnerCookie.cookieString())
              .send({ type: READ_ONLY_TYPE, isReadOnly: true })
              .expect(200);
            const { id: objectId2, type: type2 } = secondObject.body;
            expect(secondObject.body).to.have.property('accessControl');
            expect(secondObject.body.accessControl).to.have.property('owner', obj2OwnerId);
            expect(secondObject.body.accessControl).to.have.property('accessMode', 'read_only');

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
              .set('cookie', object2OwnerCookie.cookieString())
              .send({
                objects,
              })
              .expect(200);

            expect(res.body).to.have.property('statuses');
            expect(res.body.statuses).to.be.an('array');
            expect(res.body.statuses).to.have.length(2);
            expect(res.body.statuses).to.eql([
              {
                id: objectId1,
                type: READ_ONLY_TYPE,
                success: false,
                error: {
                  statusCode: 403,
                  error: 'Forbidden',
                  message:
                    'Deleting objects in read-only mode that are owned by another user requires the manage_access_control privilege.',
                },
              },
              {
                id: objectId2,
                type: READ_ONLY_TYPE,
                success: true,
              },
            ]);
          });

          it('returns status if some objects are in default mode', async () => {
            await activateSimpleUserProfile();
            const { cookie: objectOwnerCookie, profileUid: obj1OwnerId } = await loginAsObjectOwner(
              'test_user',
              'changeme'
            );
            const firstObject = await supertestWithoutAuth
              .post('/read_only_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: READ_ONLY_TYPE, isReadOnly: true })
              .expect(200);
            const { id: objectId1, type: type1 } = firstObject.body;
            expect(firstObject.body).to.have.property('accessControl');
            expect(firstObject.body.accessControl).to.have.property('owner', obj1OwnerId);
            expect(firstObject.body.accessControl).to.have.property('accessMode', 'read_only');

            const secondObject = await supertestWithoutAuth
              .post('/read_only_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: READ_ONLY_TYPE, isReadOnly: false })
              .expect(200);
            const { id: objectId2, type: type2 } = secondObject.body;
            expect(secondObject.body).to.have.property('accessControl');
            expect(secondObject.body.accessControl).to.have.property('owner', obj1OwnerId);
            expect(secondObject.body.accessControl).to.have.property('accessMode', 'default');

            await createSimpleUser(['kibana_savedobjects_editor']);
            const { cookie: notOwnerCookie } = await loginAsNotObjectOwner(
              'simple_user',
              'changeme'
            );

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
              .expect(200);

            expect(res.body).to.have.property('statuses');
            expect(res.body.statuses).to.be.an('array');
            expect(res.body.statuses).to.have.length(2);
            expect(res.body.statuses).to.eql([
              {
                id: objectId1,
                type: READ_ONLY_TYPE,
                success: false,
                error: {
                  statusCode: 403,
                  error: 'Forbidden',
                  message:
                    'Deleting objects in read-only mode that are owned by another user requires the manage_access_control privilege.',
                },
              },
              {
                id: objectId2,
                type: READ_ONLY_TYPE,
                success: true,
              },
            ]);
          });

          it('returns status if some authorized types do not support access control', async () => {
            await activateSimpleUserProfile();
            const { cookie: objectOwnerCookie, profileUid: obj1OwnerId } = await loginAsObjectOwner(
              'test_user',
              'changeme'
            );
            const firstObject = await supertestWithoutAuth
              .post('/read_only_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: READ_ONLY_TYPE, isReadOnly: true })
              .expect(200);
            const { id: objectId1, type: type1 } = firstObject.body;
            expect(firstObject.body).to.have.property('accessControl');
            expect(firstObject.body.accessControl).to.have.property('owner', obj1OwnerId);
            expect(firstObject.body.accessControl).to.have.property('accessMode', 'read_only');

            const secondObject = await supertestWithoutAuth
              .post('/read_only_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: NON_READ_ONLY_TYPE })
              .expect(200);
            const { id: objectId2, type: type2 } = secondObject.body;
            expect(secondObject.body).not.to.have.property('accessControl');

            const { cookie: notOwnerCookie } = await loginAsNotObjectOwner(
              'simple_user',
              'changeme'
            );

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
              .expect(200);

            expect(res.body).to.have.property('statuses');
            expect(res.body.statuses).to.be.an('array');
            expect(res.body.statuses).to.have.length(2);
            expect(res.body.statuses).to.eql([
              {
                id: objectId1,
                type: READ_ONLY_TYPE,
                success: false,
                error: {
                  statusCode: 403,
                  error: 'Forbidden',
                  message:
                    'Deleting objects in read-only mode that are owned by another user requires the manage_access_control privilege.',
                },
              },
              {
                id: objectId2,
                type: NON_READ_ONLY_TYPE,
                success: true,
              },
            ]);
          });
        });
      });

      describe('force bulk delete ownable objects', () => {
        // Note: force is only required on objects that exist in multiple spaces. If we want to test this
        // case against read-only objects, we should set them up to exist in multiple spaces.
        it('allows owner to bulk delete objects marked as read only', async () => {
          const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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

        it('allows admin to bulk delete objects marked as read only', async () => {
          const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
          const firstObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;

          const secondObject = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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
          expect(res.body.message).to.contain(
            `Unable to bulk_delete read_only_type, access control restrictions for`
          );
          expect(res.body.message).to.contain(`read_only_type:${objectId1}`); // order is not guaranteed
          expect(res.body.message).to.contain(`read_only_type:${objectId2}`);
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
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        await supertestWithoutAuth
          .put('/read_only_objects/change_owner')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: READ_ONLY_TYPE }],
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
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;

        expect(createResponse.body.accessControl).to.have.property('owner', adminProfileUid);

        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('test_user', 'changeme');
        const transferResponse = await supertestWithoutAuth
          .put('/read_only_objects/change_owner')
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: READ_ONLY_TYPE }],
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
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;

        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const { cookie: adminCookie } = await loginAsKibanaAdmin();
        await supertestWithoutAuth
          .put('/read_only_objects/change_owner')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: READ_ONLY_TYPE }],
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
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);
        const firstObjectId = firstCreate.body.id;

        const secondCreate = await supertestWithoutAuth
          .post('/read_only_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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
            .send({ type: READ_ONLY_TYPE, isReadOnly: true })
            .expect(200);
          const firstObjectId = firstCreate.body.id;

          const secondCreate = await supertestWithoutAuth
            .post('/read_only_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', ownerCookie.cookieString())
            .send({ type: NON_READ_ONLY_TYPE })
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
              if (object.type === READ_ONLY_TYPE) {
                expect(object).to.have.property('id', firstObjectId);
              }
              if (object.type === NON_READ_ONLY_TYPE) {
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
          .send({ type: READ_ONLY_TYPE, isReadOnly: false })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const { cookie: adminCookie } = await loginAsKibanaAdmin();
        const response = await supertestWithoutAuth
          .put('/read_only_objects/change_access_mode')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: READ_ONLY_TYPE }],
            newAccessMode: 'read_only',
          })
          .expect(200);
        expect(response.body.objects).to.have.length(1);
        expect(response.body.objects[0].id).to.eql(objectId);
        expect(response.body.objects[0].type).to.eql(READ_ONLY_TYPE);

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
          .send({ type: READ_ONLY_TYPE, isReadOnly: false })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const { cookie: adminCookie } = await loginAsKibanaAdmin();
        const response = await supertestWithoutAuth
          .put('/read_only_objects/change_access_mode')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: READ_ONLY_TYPE }],
            newAccessMode: 'read_only',
          })
          .expect(200);
        expect(response.body.objects).to.have.length(1);
        expect(response.body.objects[0].id).to.eql(objectId);
        expect(response.body.objects[0].type).to.eql(READ_ONLY_TYPE);

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
          .send({ objectId, type: READ_ONLY_TYPE })
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
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
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
            objects: [{ id: objectId, type: READ_ONLY_TYPE }],
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
          .send({ type: READ_ONLY_TYPE, isReadOnly: true })
          .expect(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        await supertestWithoutAuth
          .put('/read_only_objects/change_access_mode')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: READ_ONLY_TYPE }],
            newAccessMode: 'default',
          })
          .expect(200);

        await createSimpleUser(['kibana_savedobjects_editor']);
        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('simple_user', 'changeme');

        const updateResponse = await supertestWithoutAuth
          .put('/read_only_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .send({ objectId, type: READ_ONLY_TYPE })
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
