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
 * Tests for the #delete operation on access control saved objects.
 * Covers deleting write-restricted objects and permission checks.
 */
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('#delete', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_savedobjects_editor']);
      await createSimpleUser(es);
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('allow owner to delete object marked as write-restricted', async () => {
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
      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

      await supertestWithoutAuth
        .delete(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', objectOwnerCookie.cookieString())
        .expect(200);
    });

    it('allows admin to delete object marked as write-restricted', async () => {
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
      expect(createResponse.body.accessControl).to.have.property('owner', profileUid);

      const { cookie: adminCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);
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

    describe('should reject', function () {
      this.tags('skipFIPS');

      it('throws when trying to delete write-restricted object owned by a different user when not admin', async () => {
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
        expect(createResponse.body.accessControl).to.have.property('owner', adminProfileUid);

        const { cookie: notOwnerCookie } = await loginAsNotObjectOwner(
          supertestWithoutAuth,
          'test_user',
          'changeme'
        );
        const deleteResponse = await supertestWithoutAuth
          .delete(`/access_control_objects/${objectId}`)
          .set('kbn-xsrf', 'true')
          .set('cookie', notOwnerCookie.cookieString())
          .expect(403);
        expect(deleteResponse.body).to.have.property('message');
        expect(deleteResponse.body.message).to.contain(`Unable to delete ${ACCESS_CONTROL_TYPE}`);
      });
    });

    it('allows non-owner to delete object in default mode', async () => {
      const { cookie: ownerCookie } = await loginAsKibanaAdmin(supertestWithoutAuth);
      const createResponse = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', ownerCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE })
        .expect(200);

      const objectId = createResponse.body.id;
      const { cookie: notOwnerCookie } = await loginAsNotObjectOwner(
        supertestWithoutAuth,
        'test_user',
        'changeme'
      );

      await supertestWithoutAuth
        .delete(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', notOwnerCookie.cookieString())
        .expect(200);
    });

    it('throws when trying to delete write-restricted object by owner with revoked RBAC privileges', async () => {
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

      const deleteResponse = await supertestWithoutAuth
        .delete(`/access_control_objects/${objectId}`)
        .set('kbn-xsrf', 'true')
        .set('cookie', revokedCookie.cookieString())
        .expect(403);
      expect(deleteResponse.body).to.have.property('message');
      expect(deleteResponse.body.message).to.contain(`Unable to delete ${ACCESS_CONTROL_TYPE}`);
    });
  });
}
