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
        const { cookie: adminCookie } = await loginAsKibanaAdmin();
        const response = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(400);

        expect(response.body).to.have.property('error', 'Bad Request');
        expect(response.body.message).to.contain(
          `Cannot create a saved object of type ${ACCESS_CONTROL_TYPE} with an access mode because the type does not support access control: Bad Request`
        );
      });

      it('allows creating an object without access control metadata', async () => {
        const { cookie: adminCookie } = await loginAsKibanaAdmin();
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

      // Note: would be better to test this against an object with access control metadata and
      // verify that it makes no difference to the outcome
      it('allows overwriting an object by the creating user', async () => {
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
        const { cookie: adminCookie } = await loginAsKibanaAdmin();

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
          `Cannot create a saved object of type ${ACCESS_CONTROL_TYPE} with an access mode because the type does not support access control: Bad Request`
        );
        expect(response.body.saved_objects[1].error).to.have.property('statusCode', 400);
        expect(response.body.saved_objects[1].error).to.have.property('error', 'Bad Request');
      });

      it('allows creating objects without access control metadata', async () => {
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');

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

      // Note: would be better to test this against an object with access control metadata and
      // verify that it makes no difference to the outcome
      it('allows overwriting an objects by the creating user', async () => {
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
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
        for (const { id } of res.body.saved_objects) {
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
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
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
        for (const { id } of res.body.saved_objects) {
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

    describe('#update', () => {
      it('allows update of a write-restricted object by the creating user', async () => {
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
        const createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE })
          .expect(200);

        const objectId = createResponse.body.id;
        expect(createResponse.body.attributes).to.have.property('description', 'test');
        expect(createResponse.body).not.to.have.property('accessControl');

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

        const getResponse = await supertestWithoutAuth
          .get(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .expect(200);
        expect(getResponse.body).not.to.have.property('accessControl');
        expect(getResponse.body.attributes).to.have.property('description', 'updated description');
      });

      it('allows update of a write-restricted object by a different user', async () => {
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
        const createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE })
          .expect(200);

        const objectId = createResponse.body.id;
        expect(createResponse.body.attributes).to.have.property('description', 'test');
        expect(createResponse.body).not.to.have.property('accessControl');

        await createSimpleUser(['kibana_savedobjects_editor']);
        const { cookie: notObjectOwnerCookie } = await loginAsNotObjectOwner(
          'simple_user',
          'changeme'
        );

        const updateResponse = await supertestWithoutAuth
          .put('/access_control_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', notObjectOwnerCookie.cookieString())
          .send({ objectId, type: ACCESS_CONTROL_TYPE })
          .expect(200);

        expect(updateResponse.body.id).to.eql(objectId);
        expect(updateResponse.body.attributes).to.have.property(
          'description',
          'updated description'
        );

        const getResponse = await supertestWithoutAuth
          .get(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', notObjectOwnerCookie.cookieString())
          .expect(200);
        expect(getResponse.body).not.to.have.property('accessControl');
        expect(getResponse.body.attributes).to.have.property('description', 'updated description');
      });

      it('rejects update of a write-restricted object by a user withouth RBAC permissions', async () => {
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
        const createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE })
          .expect(200);

        const objectId = createResponse.body.id;
        expect(createResponse.body.attributes).to.have.property('description', 'test');
        expect(createResponse.body).not.to.have.property('accessControl');

        await createSimpleUser(['viewer']);
        const { cookie: notObjectOwnerCookie } = await loginAsNotObjectOwner(
          'simple_user',
          'changeme'
        );

        await supertestWithoutAuth
          .put('/access_control_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', notObjectOwnerCookie.cookieString())
          .send({ objectId, type: ACCESS_CONTROL_TYPE })
          .expect(403);
      });
    });

    describe('#bulk_update', () => {
      it('allows bulk update of a write-restricted object by the creating user', async () => {
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

        const res = await supertestWithoutAuth
          .post('/access_control_objects/bulk_update')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({
            objects,
          })
          .expect(200);
        for (const { id, attributes } of res.body.saved_objects) {
          const object = objects.find((obj) => obj.id === id);
          expect(object).to.not.be(undefined);
          expect(attributes).to.have.property('description', 'updated description');
        }
      });

      it('allows bulk update of a write-restricted object by different user', async () => {
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
        const { cookie: notObjectOwnerCookie } = await loginAsNotObjectOwner(
          'simple_user',
          'changeme'
        );

        const res = await supertestWithoutAuth
          .post('/access_control_objects/bulk_update')
          .set('kbn-xsrf', 'true')
          .set('cookie', notObjectOwnerCookie.cookieString())
          .send({
            objects,
          })
          .expect(200);
        for (const { id, attributes } of res.body.saved_objects) {
          const object = objects.find((obj) => obj.id === id);
          expect(object).to.not.be(undefined);
          expect(attributes).to.have.property('description', 'updated description');
        }
      });

      it('rejects bulk update of a write-restricted object by a user withouth RBAC permissions', async () => {
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

        await createSimpleUser(['viewer']);
        const { cookie: notObjectOwnerCookie } = await loginAsNotObjectOwner(
          'simple_user',
          'changeme'
        );

        const res = await supertestWithoutAuth
          .post('/access_control_objects/bulk_update')
          .set('kbn-xsrf', 'true')
          .set('cookie', notObjectOwnerCookie.cookieString())
          .send({
            objects,
          })
          .expect(403);
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.contain(`Unable to bulk_update ${ACCESS_CONTROL_TYPE}`);
      });
    });

    describe('#delete', () => {
      it('allow creating user to delete object', async () => {
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
        const createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE })
          .expect(200);
        const objectId = createResponse.body.id;

        await supertestWithoutAuth
          .delete(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .expect(200);

        const getResponse = await supertestWithoutAuth
          .get(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .expect(404);
        expect(getResponse.body).to.have.property('message');
        expect(getResponse.body.message).to.contain(
          `Saved object [${ACCESS_CONTROL_TYPE}/${objectId}] not found`
        );
      });

      it('allows non-creating user to delete object with permissions', async () => {
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
        const createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE })
          .expect(200);
        const objectId = createResponse.body.id;

        await createSimpleUser(['kibana_savedobjects_editor']);
        const { cookie: notObjectOwnerCookie } = await loginAsNotObjectOwner(
          'simple_user',
          'changeme'
        );
        await supertestWithoutAuth
          .delete(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', notObjectOwnerCookie.cookieString())
          .expect(200);

        const getResponse = await supertestWithoutAuth
          .get(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .expect(404);
        expect(getResponse.body).to.have.property('message');
        expect(getResponse.body.message).to.contain(
          `Saved object [${ACCESS_CONTROL_TYPE}/${objectId}] not found`
        );
      });

      it('rejects deletion of a write-restricted object by a user withouth RBAC permissions', async () => {
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner('test_user', 'changeme');
        const createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', objectOwnerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE })
          .expect(200);
        const objectId = createResponse.body.id;

        await createSimpleUser(['viewer']);
        const { cookie: notObjectOwnerCookie } = await loginAsNotObjectOwner(
          'simple_user',
          'changeme'
        );
        const res = await supertestWithoutAuth
          .delete(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', notObjectOwnerCookie.cookieString())
          .expect(403);
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.contain(`Unable to delete ${ACCESS_CONTROL_TYPE}`);
      });
    });

    describe('#bulk_delete', () => {
      it('allows bulk delete of objects by the creating user', async () => {
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

      it('allows bulk delete of objects by different user', async () => {
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
        const { cookie: notObjectOwnerCookie } = await loginAsNotObjectOwner(
          'simple_user',
          'changeme'
        );

        const res = await supertestWithoutAuth
          .post('/access_control_objects/bulk_delete')
          .set('kbn-xsrf', 'true')
          .set('cookie', notObjectOwnerCookie.cookieString())
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

      it('rejects bulk delete of objects by a user withouth RBAC permissions', async () => {
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

        await createSimpleUser(['viewer']);
        const { cookie: notObjectOwnerCookie } = await loginAsNotObjectOwner(
          'simple_user',
          'changeme'
        );

        const res = await supertestWithoutAuth
          .post('/access_control_objects/bulk_delete')
          .set('kbn-xsrf', 'true')
          .set('cookie', notObjectOwnerCookie.cookieString())
          .send({
            objects,
          })
          .expect(403);
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.contain(`Unable to bulk_delete ${ACCESS_CONTROL_TYPE}`);
      });
    });

    describe('#change_owner', () => {
      it('throws when trying to update ownership of ownable type', async () => {
        const { cookie: ownerCookie } = await loginAsObjectOwner('test_user', 'changeme');
        const createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE })
          .expect(200);
        const objectId = createResponse.body.id;

        const changeOwnershipResponse = await supertestWithoutAuth
          .put('/access_control_objects/change_owner')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
            newOwnerProfileUid: 'u_nonexistinguser_ver',
          })
          .expect(200);
        expect(changeOwnershipResponse.body.objects).to.have.length(1);
        const objectToAssert = changeOwnershipResponse.body.objects[0];
        expect(objectToAssert.id).to.eql(objectId);
        expect(objectToAssert.type).to.eql(ACCESS_CONTROL_TYPE);
        expect(objectToAssert).to.have.property('error');
        expect(objectToAssert.error.output).to.have.property('payload');
        expect(objectToAssert.error.output.payload).to.have.property('message');
        expect(objectToAssert.error.output.payload.message).to.contain(
          `The type ${ACCESS_CONTROL_TYPE} does not support access control: Bad Request`
        );
      });
    });

    describe('#change_access_mode', () => {
      it('throws when trying to update access mode of ownable type', async () => {
        const { cookie: ownerCookie } = await loginAsObjectOwner('test_user', 'changeme');
        const createResponse = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE })
          .expect(200);
        const objectId = createResponse.body.id;

        const changeAccessModeResponse = await supertestWithoutAuth
          .put('/access_control_objects/change_access_mode')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({
            objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
            newAccessMode: 'write_restricted',
          })
          .expect(200);
        expect(changeAccessModeResponse.body.objects).to.have.length(1);
        const objectToAssert = changeAccessModeResponse.body.objects[0];
        expect(objectToAssert.id).to.eql(objectId);
        expect(objectToAssert.type).to.eql(ACCESS_CONTROL_TYPE);
        expect(objectToAssert).to.have.property('error');
        expect(objectToAssert.error.output).to.have.property('payload');
        expect(objectToAssert.error.output.payload).to.have.property('message');
        expect(objectToAssert.error.output.payload.message).to.contain(
          `The type ${ACCESS_CONTROL_TYPE} does not support access control: Bad Request`
        );
      });
    });
  });
}
