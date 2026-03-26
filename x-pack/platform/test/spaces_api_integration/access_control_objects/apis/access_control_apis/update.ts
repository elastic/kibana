/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACCESS_CONTROL_TYPE } from '@kbn/access-control-test-plugin/server';
import expect from '@kbn/expect';

import {
  createSimpleUser,
  loginAsKibanaAdmin,
  loginAsNotObjectOwner,
  loginAsObjectOwner,
} from './utils/helpers';
import type { FtrProviderContext } from '../../../../functional/ftr_provider_context';

/**
 * Tests for the #update operation on access control saved objects.
 * Covers updating write-restricted objects and permission checks.
 */
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('#update', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_savedobjects_editor']);
      await createSimpleUser(es);
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should update write-restricted objects owned by the same user', async () => {
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
      expect(createResponse.body.accessControl).to.have.property('accessMode', 'write_restricted');
      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

      const updateResponse = await supertestWithoutAuth
        .put('/access_control_objects/update')
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .send({ objectId, type: ACCESS_CONTROL_TYPE })
        .expect(200);

      expect(updateResponse.body.id).to.eql(objectId);
      expect(updateResponse.body.attributes).to.have.property('description', 'updated description');
    });

    describe('should throw', function () {
      this.tags('skipFIPS');

      it('when updating write-restricted objects owned by a different user when not admin', async () => {
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
        expect(createResponse.body.attributes).to.have.property('description', 'test');
        expect(createResponse.body.accessControl).to.have.property(
          'accessMode',
          'write_restricted'
        );
        expect(createResponse.body.accessControl).to.have.property('owner', adminProfileUid);

        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner(
          supertestWithoutAuth,
          'test_user',
          'changeme'
        );
        const updateResponse = await supertestWithoutAuth
          .put('/access_control_objects/update')
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .send({ objectId, type: ACCESS_CONTROL_TYPE })
          .expect(403);
        expect(updateResponse.body).to.have.property('message');
        expect(updateResponse.body.message).to.contain(`Unable to update ${ACCESS_CONTROL_TYPE}`);
      });
    });

    it('objects with default accessMode can be modified by non-owners', async () => {
      const { cookie: adminCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);
      const response = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE })
        .expect(200);
      const objectId = response.body.id;

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
        .send({ objectId, type: ACCESS_CONTROL_TYPE });

      expect(updateResponse.body.id).to.eql(objectId);
      expect(updateResponse.body.attributes).to.have.property('description', 'updated description');
    });

    it('allows admin to update objects owned by different user', async () => {
      const { cookie: ownerCookie } = await loginAsObjectOwner(
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

      const { cookie: adminCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);
      const updateResponse = await supertestWithoutAuth
        .put('/access_control_objects/update')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({ objectId, type: ACCESS_CONTROL_TYPE })
        .expect(200);

      expect(updateResponse.body.id).to.eql(objectId);
      expect(updateResponse.body.attributes).to.have.property('description', 'updated description');
    });

    it('should throw when updating write-restricted objects by owner with revoked RBAC privileges', async () => {
      await createSimpleUser(es, ['kibana_savedobjects_editor']);
      const { cookie: ownerCookie, profileUid: ownerProfileUid } = await loginAsObjectOwner(
        supertestWithoutAuth,
        'simple_user',
        'changeme'
      );

      // const { cookie: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(supertestWithoutAuth);
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

      const updateResponse = await supertestWithoutAuth
        .put('/access_control_objects/update')
        .set('kbn-xsrf', 'true')
        .set('cookie', revokedCookie.cookieString())
        .send({ objectId, type: ACCESS_CONTROL_TYPE })
        .expect(403);
      expect(updateResponse.body).to.have.property('message');
      expect(updateResponse.body.message).to.contain(`Unable to update ${ACCESS_CONTROL_TYPE}`);
    });
  });
}
