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

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');
  const kibanaServer = getService('kibanaServer');

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

  // This test suite relies on the access_control_test_plugin, but the feature flag is explicitly disabled
  // in the congig. This means that ACCESS_CONTROL_TYPE is still registered as supporting access control,
  // however, the feature is disabled and the type will not support access control in practice. These tests
  // aim to validate that the object type still behaves as expected - like any other object that does not
  // support access control.
  describe('access control saved objects - feature disabled', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_savedobjects_editor']);
      await createSimpleUser();
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    describe('#create', () => {
      it('rejects creating a write-restricted object', async () => {
        const { cookie: adminCookie, profileUid } = await loginAsKibanaAdmin();
        const response = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(400);

        expect(response.body).to.have.property('error', 'Bad Request');
        expect(response.body.message).to.contain(
          `The "accessMode" field is not supported for saved objects of type "${ACCESS_CONTROL_TYPE}".: Bad Request`
        );
      });

      it('allows creating an object without access control metadata', async () => {
        const { cookie: adminCookie, profileUid } = await loginAsKibanaAdmin();
        const response = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'xxxxx')
          .set('cookie', adminCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE })
          .expect(200);
        expect(response.body).not.to.have.property('accessControl');
        expect(response.body).to.have.property('type');
        const { type } = response.body;
        expect(type).to.be(ACCESS_CONTROL_TYPE);
      });

      it('allows creating an object when there is no active user profile', async () => {
        const response = await supertest
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .send({ type: ACCESS_CONTROL_TYPE })
          .expect(200);
        expect(response.body).not.to.have.property('accessControl');
        expect(response.body).to.have.property('type');
        const { type } = response.body;
        expect(type).to.be(ACCESS_CONTROL_TYPE);
      });

      it('allows overwriting an object by the creating user', async () => {
        const { cookie: objectOwnerCookie, profileUid } = await loginAsObjectOwner(
          'test_user',
          'changeme'
        );
        const createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, description: 'this will change' })
          .expect(200);

        const objectId = createResponse.body.id;
        expect(createResponse.body).not.to.have.property('accessControl');

        let getResponse = await supertestWithoutAuth
          .get(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .expect(200);
        expect(getResponse.body).not.to.have.property('accessControl');
        expect(getResponse.body.attributes).to.have.property('description', 'this will change');

        const overwriteResponse = await supertestWithoutAuth
          .post('/access_control_objects/create?overwrite=true')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ id: objectId, type: ACCESS_CONTROL_TYPE, description: 'overwritten!' })
          .expect(200);

        expect(overwriteResponse.body).to.have.property('id', objectId);
        expect(overwriteResponse.body).not.to.have.property('accessControl');

        getResponse = await supertestWithoutAuth
          .get(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .expect(200);
        expect(getResponse.body).not.to.have.property('accessControl');
        expect(getResponse.body.attributes).to.have.property('description', 'overwritten!');
      });

      it('allows overwriting an object by a different user', async () => {
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
        const createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, description: 'this will change' })
          .expect(200);

        const objectId = createResponse.body.id;
        expect(createResponse.body).not.to.have.property('accessControl');

        let getResponse = await supertestWithoutAuth
          .get(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .expect(200);
        expect(getResponse.body).not.to.have.property('accessControl');
        expect(getResponse.body.attributes).to.have.property('description', 'this will change');

        await createSimpleUser(['kibana_savedobjects_editor']);
        const { cookie: notObjectOwnerCookie } = await loginAsNotObjectOwner(
          'simple_user',
          'changeme'
        );

        const overwriteResponse = await supertestWithoutAuth
          .post('/access_control_objects/create?overwrite=true')
          .set('kbn-xsrf', 'true')
          .set('cookie', notObjectOwnerCookie.cookieString())
          .send({ id: objectId, type: ACCESS_CONTROL_TYPE, description: 'overwritten!' })
          .expect(200);

        expect(overwriteResponse.body).to.have.property('id', objectId);
        expect(overwriteResponse.body).not.to.have.property('accessControl');

        getResponse = await supertestWithoutAuth
          .get(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', notObjectOwnerCookie.cookieString())
          .expect(200);
        expect(getResponse.body).not.to.have.property('accessControl');
        expect(getResponse.body.attributes).to.have.property('description', 'overwritten!');
      });
    });

    describe('#bulk_create', () => {
      it('returns error status when attempting to create write-restricted objects', async () => {
        const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin();

        const response = await supertestWithoutAuth
          .post('/access_control_objects/bulk_create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({
            objects: [
              { type: ACCESS_CONTROL_TYPE, description: 'valid object' },
              {
                type: ACCESS_CONTROL_TYPE,
                isWriteRestricted: true,
                description: 'invalid object',
              },
            ],
          })
          .expect(200);

        expect(response.body).to.have.property('saved_objects');
        expect(Array.isArray(response.body.saved_objects)).to.be(true);
        expect(response.body.saved_objects).to.have.length(2);
        expect(response.body.saved_objects[0].attributes).to.have.property(
          'description',
          'valid object'
        );
        expect(response.body.saved_objects[1]).to.have.property('error');
        expect(response.body.saved_objects[1].error).to.have.property(
          'message',
          `Cannot create a saved object of type "${ACCESS_CONTROL_TYPE}" with an access mode because the type does not support access control.: Bad Request`
        );
        expect(response.body.saved_objects[1].error).to.have.property('statusCode', 400);
        expect(response.body.saved_objects[1].error).to.have.property('error', 'Bad Request');
      });

      it('allows creating objects without access control metadata', async () => {
        const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
          await loginAsObjectOwner('test_user', 'changeme');

        const bulkCreateResponse = await supertestWithoutAuth
          .post('/access_control_objects/bulk_create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({
            objects: [{ type: ACCESS_CONTROL_TYPE }, { type: ACCESS_CONTROL_TYPE }],
          });
        expect(bulkCreateResponse.body.saved_objects).to.have.length(2);
        for (const obj of bulkCreateResponse.body.saved_objects) {
          expect(obj).not.to.have.property('accessControl');
          const getResponse = await supertestWithoutAuth
            .get(`/access_control_objects/${obj.id}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .expect(200);
          expect(getResponse.body).not.to.have.property('accessControl');
        }
      });

      it('allows creating objects when there is no active user profile', async () => {
        const bulkCreateResponse = await supertest
          .post('/access_control_objects/bulk_create')
          .set('kbn-xsrf', 'true')
          .send({
            objects: [{ type: ACCESS_CONTROL_TYPE }, { type: ACCESS_CONTROL_TYPE }],
          });
        expect(bulkCreateResponse.body.saved_objects).to.have.length(2);
        for (const obj of bulkCreateResponse.body.saved_objects) {
          expect(obj).not.to.have.property('accessControl');
          const getResponse = await supertest
            .get(`/access_control_objects/${obj.id}`)
            .set('kbn-xsrf', 'true')
            .expect(200);
          expect(getResponse.body).not.to.have.property('accessControl');
          expect(getResponse.body.createdBy).to.be(undefined);
        }
      });

      it('allows overwriting an objects by the creating user', async () => {
        const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
          await loginAsObjectOwner('test_user', 'changeme');
        const firstObject = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, description: 'this will change' })
          .expect(200);
        const { id: objectId1, type: type1 } = firstObject.body;

        const secondObject = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, description: 'this will also change' })
          .expect(200);
        const { id: objectId2, type: type2 } = secondObject.body;

        const objects = [
          {
            id: objectId1,
            type: type1,
            description: 'overwritten!',
          },
          {
            id: objectId2,
            type: type2,
            description: 'overwritten!',
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
          expect(object).not.to.have.property('accessControl');

          const getResponse = await supertestWithoutAuth
            .get(`/access_control_objects/${id}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', objectOwnerCookie.cookieString())
            .expect(200);
          expect(getResponse.body).not.to.have.property('accessControl');
          expect(getResponse.body.attributes).to.have.property('description', 'overwritten!');
        }
      });

      it('allows overwriting an objects by a different user', async () => {
        const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
          await loginAsObjectOwner('test_user', 'changeme');
        const firstObject = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, description: 'this will change' })
          .expect(200);
        const { id: objectId1, type: type1 } = firstObject.body;

        const secondObject = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, description: 'this will also change' })
          .expect(200);
        const { id: objectId2, type: type2 } = secondObject.body;

        const objects = [
          {
            id: objectId1,
            type: type1,
            description: 'overwritten!',
          },
          {
            id: objectId2,
            type: type2,
            description: 'overwritten!',
          },
        ];

        await createSimpleUser(['kibana_savedobjects_editor']);
        const { cookie: notObjectOwnerCookie } = await loginAsNotObjectOwner(
          'simple_user',
          'changeme'
        );

        const res = await supertestWithoutAuth
          .post('/access_control_objects/bulk_create?overwrite=true')
          .set('kbn-xsrf', 'true')
          .set('cookie', notObjectOwnerCookie.cookieString())
          .send({
            objects,
          })
          .expect(200);
        for (const { id, accessControl } of res.body.saved_objects) {
          const object = objects.find((obj) => obj.id === id);
          expect(object).to.not.be(undefined);
          expect(object).not.to.have.property('accessControl');

          const getResponse = await supertestWithoutAuth
            .get(`/access_control_objects/${id}`)
            .set('kbn-xsrf', 'true')
            .set('cookie', notObjectOwnerCookie.cookieString())
            .expect(200);
          expect(getResponse.body).not.to.have.property('accessControl');
          expect(getResponse.body.attributes).to.have.property('description', 'overwritten!');
        }
      });
    });

    describe.skip('#update', () => {
      // ToDo: need to import objects containing access control metadata
      it('allows update of a write-restricted object by the creating user', async () => {
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
        expect(createResponse.body.accessControl).to.have.property(
          'accessMode',
          'write_restricted'
        );
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const updateResponse = await supertestWithoutAuth
          .put('/access_control_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ objectId, type: ACCESS_CONTROL_TYPE })
          .expect(200);

        expect(updateResponse.body.id).to.eql(objectId);
        expect(updateResponse.body.attributes).to.have.property(
          'description',
          'updated description'
        );
      });

      it('allows update of a write-restricted object by a different user', async () => {
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
        expect(createResponse.body.accessControl).to.have.property(
          'accessMode',
          'write_restricted'
        );
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const updateResponse = await supertestWithoutAuth
          .put('/access_control_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ objectId, type: ACCESS_CONTROL_TYPE })
          .expect(200);

        expect(updateResponse.body.id).to.eql(objectId);
        expect(updateResponse.body.attributes).to.have.property(
          'description',
          'updated description'
        );
      });

      it('rejects update of a write-restricted object by a user withouth RBAC permissions', async () => {
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
        expect(createResponse.body.accessControl).to.have.property(
          'accessMode',
          'write_restricted'
        );
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const updateResponse = await supertestWithoutAuth
          .put('/access_control_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ objectId, type: ACCESS_CONTROL_TYPE })
          .expect(200);

        expect(updateResponse.body.id).to.eql(objectId);
        expect(updateResponse.body.attributes).to.have.property(
          'description',
          'updated description'
        );
      });
    });

    describe.skip('#bulk_update', () => {
      describe('success', () => {
        it('allows owner to bulk update objects marked as write restricted', async () => {
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

        it('allows admin to bulk update objects marked as write restricted', async () => {
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

      describe('failuere modes', () => {
        it('rejects if all objects are write-restricted and inaccessible', async () => {
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

        it('returns status if all objects are write-restricted but some are owned by the current user', async () => {
          await activateSimpleUserProfile();
          const { cookie: object1OwnerCookie, profileUid: obj1OwnerId } = await loginAsObjectOwner(
            'test_user',
            'changeme'
          );
          const firstObject = await supertestWithoutAuth
            .post('/access_control_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', object1OwnerCookie.cookieString())
            .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;
          expect(firstObject.body).to.have.property('accessControl');
          expect(firstObject.body.accessControl).to.have.property('owner', obj1OwnerId);
          expect(firstObject.body.accessControl).to.have.property('accessMode', 'write_restricted');

          await createSimpleUser(['kibana_savedobjects_editor']);
          const { cookie: object2OwnerCookie, profileUid: obj2OwnerId } =
            await loginAsNotObjectOwner('simple_user', 'changeme');

          const secondObject = await supertestWithoutAuth
            .post('/access_control_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', object2OwnerCookie.cookieString())
            .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
            .expect(200);
          const { id: objectId2, type: type2 } = secondObject.body;
          expect(secondObject.body).to.have.property('accessControl');
          expect(secondObject.body.accessControl).to.have.property('owner', obj2OwnerId);
          expect(secondObject.body.accessControl).to.have.property(
            'accessMode',
            'write_restricted'
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
            .post('/access_control_objects/bulk_update')
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
            type: ACCESS_CONTROL_TYPE,
            error: {
              statusCode: 403,
              error: 'Forbidden',
              message:
                'Updating objects in "write_restricted" mode that are owned by another user requires the "manage_access_control" privilege.',
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
            .post('/access_control_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', object1OwnerCookie.cookieString())
            .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;
          expect(firstObject.body).to.have.property('accessControl');
          expect(firstObject.body.accessControl).to.have.property('owner', obj1OwnerId);
          expect(firstObject.body.accessControl).to.have.property('accessMode', 'write_restricted');

          const secondObject = await supertestWithoutAuth
            .post('/access_control_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', object1OwnerCookie.cookieString())
            .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: false })
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
            .post('/access_control_objects/bulk_update')
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
            type: ACCESS_CONTROL_TYPE,
            error: {
              statusCode: 403,
              error: 'Forbidden',
              message:
                'Updating objects in "write_restricted" mode that are owned by another user requires the "manage_access_control" privilege.',
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
            .post('/access_control_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', object1OwnerCookie.cookieString())
            .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
            .expect(200);
          const { id: objectId1, type: type1 } = firstObject.body;
          expect(firstObject.body).to.have.property('accessControl');
          expect(firstObject.body.accessControl).to.have.property('owner', obj1OwnerId);
          expect(firstObject.body.accessControl).to.have.property('accessMode', 'write_restricted');

          const secondObject = await supertestWithoutAuth
            .post('/access_control_objects/create')
            .set('kbn-xsrf', 'true')
            .set('cookie', object1OwnerCookie.cookieString())
            .send({ type: NON_ACCESS_CONTROL_TYPE })
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
            .post('/access_control_objects/bulk_update')
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
            type: ACCESS_CONTROL_TYPE,
            error: {
              statusCode: 403,
              error: 'Forbidden',
              message:
                'Updating objects in "write_restricted" mode that are owned by another user requires the "manage_access_control" privilege.',
            },
          });
          expect(res.body.saved_objects[1]).to.have.property('id', objectId2);
          expect(res.body.saved_objects[1]).to.have.property('type', type2);
          expect(res.body.saved_objects[1]).to.have.property('updated_by', obj2OwnerId);
          expect(res.body.saved_objects[1]).not.to.have.property('error');
        });
      });
    });

    describe.skip('#delete', () => {
      it('allow owner to delete object marked as write-restricted', async () => {
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
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        await supertestWithoutAuth
          .delete(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .expect(200);
      });

      it('allows admin to delete object marked as write-restricted', async () => {
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
        expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

        const { cookie: adminCookie } = await loginAsKibanaAdmin();
        await supertestWithoutAuth
          .delete(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .expect(200);

        const getResponse = await supertestWithoutAuth
          .get(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .expect(404);
        expect(getResponse.body).to.have.property('message');
        expect(getResponse.body.message).to.contain(
          `Saved object [${ACCESS_CONTROL_TYPE}/${objectId}] not found`
        );
      });

      it('throws when trying to delete write-restricted object owned by a different user when not admin', async () => {
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
        const deleteResponse = await supertestWithoutAuth
          .delete(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .expect(403);
        expect(deleteResponse.body).to.have.property('message');
        expect(deleteResponse.body.message).to.contain(`Unable to delete ${ACCESS_CONTROL_TYPE}`);
      });

      it('allows non-owner to delete object in default mode', async () => {
        const { cookie: ownerCookie } = await loginAsKibanaAdmin();
        const createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE })
          .expect(200);

        const objectId = createResponse.body.id;
        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('test_user', 'changeme');

        await supertestWithoutAuth
          .delete(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .expect(200);
      });
    });

    describe.skip('#bulk_delete', () => {
      describe('bulk delete ownable objects', () => {
        describe('success', () => {
          it('allows owner to bulk delete objects in write-restricted mode', async () => {
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

            const res = await supertestWithoutAuth
              .post('/access_control_objects/bulk_delete')
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
            const { cookie: notOwnerCookie } = await loginAsNotObjectOwner(
              'simple_user',
              'changeme'
            );

            await supertestWithoutAuth
              .post('/access_control_objects/bulk_delete')
              .set('kbn-xsrf', 'true')
              .set('cookie', notOwnerCookie.cookieString())
              .send({ objects })
              .expect(200);

            await supertestWithoutAuth
              .get(`/access_control_objects/${objectId1}`)
              .set('kbn-xsrf', 'true')
              .set('cookie', notOwnerCookie.cookieString())
              .expect(404);

            await supertestWithoutAuth
              .get(`/access_control_objects/${objectId2}`)
              .set('kbn-xsrf', 'true')
              .set('cookie', notOwnerCookie.cookieString())
              .expect(404);
          });

          it('allows admin to bulk delete objects they do not own', async () => {
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
              .post('/access_control_objects/bulk_delete')
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
          it('rejects if all objects are write-restricted and inaccessible', async () => {
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
              .post('/access_control_objects/bulk_delete')
              .set('kbn-xsrf', 'true')
              .set('cookie', notOwnerCookie.cookieString())
              .send({
                objects,
              })
              .expect(403);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.contain(
              `Unable to bulk_delete ${ACCESS_CONTROL_TYPE}, access control restrictions for`
            );
            expect(res.body.message).to.contain(`${ACCESS_CONTROL_TYPE}:${objectId1}`); // order is not guaranteed
            expect(res.body.message).to.contain(`${ACCESS_CONTROL_TYPE}:${objectId2}`);
          });

          it('returns status if all objects are write-restricted but some objects are owned by the current user', async () => {
            await activateSimpleUserProfile();
            const { cookie: object1OwnerCookie, profileUid: obj1OwnerId } =
              await loginAsObjectOwner('test_user', 'changeme');
            const firstObject = await supertestWithoutAuth
              .post('/access_control_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', object1OwnerCookie.cookieString())
              .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
              .expect(200);
            const { id: objectId1, type: type1 } = firstObject.body;
            expect(firstObject.body).to.have.property('accessControl');
            expect(firstObject.body.accessControl).to.have.property('owner', obj1OwnerId);
            expect(firstObject.body.accessControl).to.have.property(
              'accessMode',
              'write_restricted'
            );

            await createSimpleUser(['kibana_savedobjects_editor']);
            const { cookie: object2OwnerCookie, profileUid: obj2OwnerId } =
              await loginAsNotObjectOwner('simple_user', 'changeme');

            const secondObject = await supertestWithoutAuth
              .post('/access_control_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', object2OwnerCookie.cookieString())
              .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
              .expect(200);
            const { id: objectId2, type: type2 } = secondObject.body;
            expect(secondObject.body).to.have.property('accessControl');
            expect(secondObject.body.accessControl).to.have.property('owner', obj2OwnerId);
            expect(secondObject.body.accessControl).to.have.property(
              'accessMode',
              'write_restricted'
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
              .post('/access_control_objects/bulk_delete')
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
                type: ACCESS_CONTROL_TYPE,
                success: false,
                error: {
                  statusCode: 403,
                  error: 'Forbidden',
                  message:
                    'Deleting objects in "write_restricted" mode that are owned by another user requires the "manage_access_control" privilege.',
                },
              },
              {
                id: objectId2,
                type: ACCESS_CONTROL_TYPE,
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
              .post('/access_control_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
              .expect(200);
            const { id: objectId1, type: type1 } = firstObject.body;
            expect(firstObject.body).to.have.property('accessControl');
            expect(firstObject.body.accessControl).to.have.property('owner', obj1OwnerId);
            expect(firstObject.body.accessControl).to.have.property(
              'accessMode',
              'write_restricted'
            );

            const secondObject = await supertestWithoutAuth
              .post('/access_control_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: false })
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
              .post('/access_control_objects/bulk_delete')
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
                type: ACCESS_CONTROL_TYPE,
                success: false,
                error: {
                  statusCode: 403,
                  error: 'Forbidden',
                  message:
                    'Deleting objects in "write_restricted" mode that are owned by another user requires the "manage_access_control" privilege.',
                },
              },
              {
                id: objectId2,
                type: ACCESS_CONTROL_TYPE,
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
              .post('/access_control_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
              .expect(200);
            const { id: objectId1, type: type1 } = firstObject.body;
            expect(firstObject.body).to.have.property('accessControl');
            expect(firstObject.body.accessControl).to.have.property('owner', obj1OwnerId);
            expect(firstObject.body.accessControl).to.have.property(
              'accessMode',
              'write_restricted'
            );

            const secondObject = await supertestWithoutAuth
              .post('/access_control_objects/create')
              .set('kbn-xsrf', 'true')
              .set('cookie', objectOwnerCookie.cookieString())
              .send({ type: NON_ACCESS_CONTROL_TYPE })
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
              .post('/access_control_objects/bulk_delete')
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
                type: ACCESS_CONTROL_TYPE,
                success: false,
                error: {
                  statusCode: 403,
                  error: 'Forbidden',
                  message:
                    'Deleting objects in "write_restricted" mode that are owned by another user requires the "manage_access_control" privilege.',
                },
              },
              {
                id: objectId2,
                type: NON_ACCESS_CONTROL_TYPE,
                success: true,
              },
            ]);
          });
        });
      });

      describe('force bulk delete ownable objects', () => {
        it('allow owner to bulk delete objects marked as write-restricted', async () => {
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

          const res = await supertestWithoutAuth
            .post('/access_control_objects/bulk_delete')
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

        it('allow admin to bulk delete objects marked as write-restricted', async () => {
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
            .post('/access_control_objects/bulk_delete')
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
        it('does not allow non-owner to bulk delete objects marked as write-restricted', async () => {
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
            .post('/access_control_objects/bulk_delete')
            .set('kbn-xsrf', 'true')
            .set('cookie', notOwnerCookie.cookieString())
            .send({
              objects,
              force: true,
            })
            .expect(403);
          expect(res.body).to.have.property('message');
          expect(res.body.message).to.contain(
            `Unable to bulk_delete ${ACCESS_CONTROL_TYPE}, access control restrictions for`
          );
          expect(res.body.message).to.contain(`${ACCESS_CONTROL_TYPE}:${objectId1}`); // order is not guaranteed
          expect(res.body.message).to.contain(`${ACCESS_CONTROL_TYPE}:${objectId2}`);
        });
      });
    });

    describe.skip('#change_ownership', () => {
      it('should transfer ownership of write-restricted objects by owner', async () => {
        const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile();

        const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
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
        const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
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

    describe.skip('#change_access_mode', () => {
      it('should allow admins to change access mode of any object', async () => {
        const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
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
        const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
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
        const { cookie: ownerCookie, profileUid } = await loginAsObjectOwner(
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

        await createSimpleUser(['kibana_savedobjects_editor']);
        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner('simple_user', 'changeme');

        const updateResponse = await supertestWithoutAuth
          .put('/access_control_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .send({ objectId, type: ACCESS_CONTROL_TYPE })
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
