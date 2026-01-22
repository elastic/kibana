/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACCESS_CONTROL_TYPE } from '@kbn/access-control-test-plugin/server';
import expect from '@kbn/expect';

import { createSimpleUser, loginAsKibanaAdmin } from './utils/helpers';
import type { FtrProviderContext } from '../../../../functional/ftr_provider_context';

/**
 * Tests for the default state of access control objects.
 * Verifies that types supporting access control are created with correct default settings.
 */
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('default state of access control objects', () => {
    before(async () => {
      await security.testUser.setRoles(['kibana_savedobjects_editor']);
      await createSimpleUser(es);
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('types supporting access control are created with default access mode when not specified', async () => {
      const { cookie: adminCookie, profileUid } = await loginAsKibanaAdmin(supertestWithoutAuth);
      const response = await supertestWithoutAuth
        .post('/access_control_objects/create')
        .set('kbn-xsrf', 'true')
        .set('cookie', adminCookie.cookieString())
        .send({ type: ACCESS_CONTROL_TYPE })
        .expect(200);
      expect(response.body).to.have.property('accessControl');
      expect(response.body.accessControl).to.have.property('accessMode', 'default');
      expect(response.body.accessControl).to.have.property('owner', profileUid);
    });
  });
}
