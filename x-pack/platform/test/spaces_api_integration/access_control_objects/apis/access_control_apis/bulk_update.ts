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
  activateSimpleUserProfile,
  createSimpleUser,
  loginAsKibanaAdmin,
  loginAsNotObjectOwner,
  loginAsObjectOwner,
} from './utils/helpers';
import type { FtrProviderContext } from '../../../../functional/ftr_provider_context';

/**
 * Tests for the #bulk_update operation on access control saved objects.
 * Covers bulk updating write-restricted objects and permission checks.
 */
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('#bulk_update', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_savedobjects_editor']);
      await createSimpleUser(es);
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    describe('success', () => {
      it('allows owner to bulk update objects marked as write restricted', async () => {
        const { cookie: objectOwnerCookie, profileUid: objectOwnerProfileUid } =
          await loginAsObjectOwner(supertestWithoutAuth, 'test_user', 'changeme');
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
          await loginAsObjectOwner(supertestWithoutAuth, 'test_user', 'changeme');
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
        const { cookie: adminCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);
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
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner(
          supertestWithoutAuth,
          'test_user',
          'changeme'
        );
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

        await createSimpleUser(es, ['kibana_savedobjects_editor']);
        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner(
          supertestWithoutAuth,
          'simple_user',
          'changeme'
        );

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
        await activateSimpleUserProfile(es);
        const { cookie: objectOwnerCookie } = await loginAsObjectOwner(
          supertestWithoutAuth,
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
        const { cookie: nonOwnerCookie } = await loginAsNotObjectOwner(
          supertestWithoutAuth,
          'simple_user',
          'changeme'
        );
        const res = await supertestWithoutAuth
          .post('/access_control_objects/bulk_update')
          .set('kbn-xsrf', 'true')
          .set('cookie', nonOwnerCookie.cookieString())
          .send({
            objects,
          })
          .expect(403);
        expect(res.body).to.have.property('message');
        expect(res.body.message).to.contain(
          `Unable to bulk_update ${ACCESS_CONTROL_TYPE}. Access control restrictions for objects:`
        );
        expect(res.body.message).to.contain(`${ACCESS_CONTROL_TYPE}:${objectId1}`);
        expect(res.body.message).to.contain(`${ACCESS_CONTROL_TYPE}:${objectId2}`);
        expect(res.body.message).to.contain(
          `The "manage_access_control" privilege is required to affect write restricted objects owned by another user.`
        );
      });

      it('returns status if all objects are write-restricted but some are owned by the current user', async () => {
        await activateSimpleUserProfile(es);
        const { cookie: object1OwnerCookie, profileUid: obj1OwnerId } = await loginAsObjectOwner(
          supertestWithoutAuth,
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

        await createSimpleUser(es, ['kibana_savedobjects_editor']);
        const { cookie: object2OwnerCookie, profileUid: obj2OwnerId } = await loginAsNotObjectOwner(
          supertestWithoutAuth,
          'simple_user',
          'changeme'
        );

        const secondObject = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', object2OwnerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE, isWriteRestricted: true })
          .expect(200);
        const { id: objectId2, type: type2 } = secondObject.body;
        expect(secondObject.body).to.have.property('accessControl');
        expect(secondObject.body.accessControl).to.have.property('owner', obj2OwnerId);
        expect(secondObject.body.accessControl).to.have.property('accessMode', 'write_restricted');

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
        await activateSimpleUserProfile(es);
        const { cookie: object1OwnerCookie, profileUid: obj1OwnerId } = await loginAsObjectOwner(
          supertestWithoutAuth,
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

        await createSimpleUser(es, ['kibana_savedobjects_editor']);
        const { cookie: object2OwnerCookie, profileUid: obj2OwnerId } = await loginAsNotObjectOwner(
          supertestWithoutAuth,
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
        await activateSimpleUserProfile(es);
        const { cookie: object1OwnerCookie, profileUid: obj1OwnerId } = await loginAsObjectOwner(
          supertestWithoutAuth,
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

        await createSimpleUser(es, ['kibana_savedobjects_editor']);
        const { cookie: object2OwnerCookie, profileUid: obj2OwnerId } = await loginAsNotObjectOwner(
          supertestWithoutAuth,
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

      it('rejects if owner no longer has adequate RBAC privileges', async () => {
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
        expect(firstObject.body).to.have.property('accessControl');
        expect(firstObject.body.accessControl).to.have.property('owner', ownerProfileUid);
        expect(firstObject.body.accessControl).to.have.property('accessMode', 'write_restricted');

        const secondObject = await supertestWithoutAuth
          .post('/access_control_objects/create')
          .set('kbn-xsrf', 'true')
          .set('cookie', ownerCookie.cookieString())
          .send({ type: ACCESS_CONTROL_TYPE })
          .expect(200);
        const { id: objectId2, type: type2 } = secondObject.body;
        expect(secondObject.body).to.have.property('accessControl');
        expect(secondObject.body.accessControl).to.have.property('owner', ownerProfileUid);
        expect(secondObject.body.accessControl).to.have.property('accessMode', 'default');

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
          .post('/access_control_objects/bulk_update')
          .set('kbn-xsrf', 'true')
          .set('cookie', revokedCookie.cookieString())
          .send({
            objects,
          })
          .expect(403);

        expect(res.body).to.have.property('message');
        expect(res.body.message).to.contain(`Unable to bulk_update ${ACCESS_CONTROL_TYPE}`);
        expect(res.body.message).not.to.contain(
          `, access control restrictions for ${ACCESS_CONTROL_TYPE}:`
        );
      });
    });
  });
}
