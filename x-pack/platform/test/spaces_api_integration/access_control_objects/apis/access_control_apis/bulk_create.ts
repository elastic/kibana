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

import {
  createSimpleUser,
  loginAsKibanaAdmin,
  loginAsNotObjectOwner,
  loginAsObjectOwner,
} from './utils/helpers';
import type { FtrProviderContext } from '../../../../functional/ftr_provider_context';

/**
 * Tests for the #bulk_create operation on access control saved objects.
 * Covers bulk creating write-restricted objects, overwriting, and permission checks.
 */
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('#bulk_create', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_savedobjects_editor']);
      await createSimpleUser(es);
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    describe('success', () => {
      it('should create write-restricted objects', async () => {
        const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
          await loginAsObjectOwner(supertestWithoutAuth, 'test_user', 'changeme');

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

      it('allows owner to overwrite objects they own', async () => {
        const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
          await loginAsObjectOwner(supertestWithoutAuth, 'test_user', 'changeme');
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

      it('allows non-owner to overwrite objects in default mode', async () => {
        const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(
          supertestWithoutAuth
        );

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
          supertestWithoutAuth,
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

      it('allows admin to overwrite objects they do not own', async () => {
        const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
          await loginAsObjectOwner(supertestWithoutAuth, 'test_user', 'changeme');
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

        const { cookie: adminCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);

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
    });

    describe('failure modes', function () {
      this.tags('skipFIPS');

      it('rejects when overwriting and all objects are write-restricted and inaccessible', async () => {
        const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(
          supertestWithoutAuth
        );

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
          supertestWithoutAuth,
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
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.contain(
          `Unable to bulk_create ${ACCESS_CONTROL_TYPE}. Access control restrictions for objects:`
        );
        expect(res.body.message).to.contain(`${ACCESS_CONTROL_TYPE}:${objectId1}`); // order is not guaranteed
        expect(res.body.message).to.contain(`${ACCESS_CONTROL_TYPE}:${objectId2}`);
        expect(res.body.message).to.contain(
          `The "manage_access_control" privilege is required to affect write restricted objects owned by another user.`
        );

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

      it('return status when overwriting objects and all objects are write-restricted but some are owned by current user', async () => {
        const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(
          supertestWithoutAuth
        );

        const firstObject = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        const { id: objectId1, type: type1 } = firstObject.body;
        expect(firstObject.body).to.have.property('accessControl');
        expect(firstObject.body.accessControl).to.have.property('owner', adminProfileUid);

        const { cookie: notObjectOwnerCookieCookie, profileUid: nonAdminProfileUid } =
          await loginAsNotObjectOwner(supertestWithoutAuth, 'test_user', 'changeme');

        const secondObject = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', notObjectOwnerCookieCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
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
          .post('/access_control_objects/bulk_create?overwrite=true')
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
          type: ACCESS_CONTROL_TYPE,
          error: {
            statusCode: 403,
            error: 'Forbidden',
            message:
              'Overwriting objects in "write_restricted" mode that are owned by another user requires the "manage_access_control" privilege.',
          },
        });
        expect(res.body.saved_objects[1]).to.have.property('type', ACCESS_CONTROL_TYPE);
        expect(res.body.saved_objects[1]).to.have.property('id', objectId2);
        expect(res.body.saved_objects[1]).not.to.have.property('error');
      });

      it('return status when overwriting objects and some objects are in default mode', async () => {
        const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(
          supertestWithoutAuth
        );

        const firstObject = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        const { id: objectId1, type: type1 } = firstObject.body;
        expect(firstObject.body).to.have.property('accessControl');
        expect(firstObject.body.accessControl).to.have.property('owner', adminProfileUid);

        const secondObject = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: false })
          .expect(200);
        const { id: objectId2, type: type2 } = secondObject.body;
        expect(secondObject.body).to.have.property('accessControl');
        expect(secondObject.body.accessControl).to.have.property('owner', adminProfileUid);

        const { cookie: notObjectOwnerCookieCookie } = await loginAsNotObjectOwner(
          supertestWithoutAuth,
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
          .post('/access_control_objects/bulk_create?overwrite=true')
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
          type: ACCESS_CONTROL_TYPE,
          error: {
            statusCode: 403,
            error: 'Forbidden',
            message:
              'Overwriting objects in "write_restricted" mode that are owned by another user requires the "manage_access_control" privilege.',
          },
        });
        expect(res.body.saved_objects[1]).to.have.property('type', ACCESS_CONTROL_TYPE);
        expect(res.body.saved_objects[1]).to.have.property('id', objectId2);
        expect(res.body.saved_objects[1]).not.to.have.property('error');
      });

      it('return stauts when overwriting and some authorized types do not support access control', async () => {
        const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(
          supertestWithoutAuth
        );

        const firstObject = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        const { id: objectId1, type: type1 } = firstObject.body;
        expect(firstObject.body).to.have.property('accessControl');
        expect(firstObject.body.accessControl).to.have.property('owner', adminProfileUid);

        const secondObject = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .send({ type: NON_ACCESS_CONTROL_TYPE })
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
          supertestWithoutAuth,
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
              'Overwriting objects in "write_restricted" mode that are owned by another user requires the "manage_access_control" privilege.',
          },
        });
        expect(res.body.saved_objects[1]).to.have.property('type', NON_ACCESS_CONTROL_TYPE);
        expect(res.body.saved_objects[1]).to.have.property('id', objectId2);
        expect(res.body.saved_objects[1]).not.to.have.property('error');
      });

      it('rejects when overwriting by owner if RBAC privileges are revoked', async () => {
        await createSimpleUser(es, ['kibana_savedobjects_editor']);
        const { cookie: ownerCookie, profileUid: ownerProfileUid } = await loginAsObjectOwner(
          supertestWithoutAuth,
          'simple_user',
          'changeme'
        );

        const firstObject = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        const { id: objectId1, type: type1 } = firstObject.body;
        expect(firstObject.body.accessControl).to.have.property('owner', ownerProfileUid);

        const secondObject = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        const { id: objectId2, type: type2 } = secondObject.body;
        expect(secondObject.body.accessControl).to.have.property('owner', ownerProfileUid);

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

        // revoke privs
        await createSimpleUser(es, ['viewer']);

        // Verify owner
        const { cookie: adminCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);
        let getResponse = await supertestWithoutAuth
          .get(`/access_control_objects/${objectId1}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', adminCookie.cookieString())
          .expect(200);
        expect(getResponse.body).to.have.property('accessControl');
        expect(getResponse.body.accessControl).to.have.property('owner', ownerProfileUid);
        getResponse = await supertestWithoutAuth
          .get(`/access_control_objects/${objectId2}`)
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

        const res = await supertestWithoutAuth
          .post('/access_control_objects/bulk_create?overwrite=true')
          .set('kbn-xsrf', 'true')
          .set('cookie', revokedCookie.cookieString())
          .send({
            objects,
          })
          .expect(403);

        expect(res.body).to.have.property('error', 'Forbidden');
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.be(`Unable to bulk_create ${ACCESS_CONTROL_TYPE}`);
      });
    });
  });
}
