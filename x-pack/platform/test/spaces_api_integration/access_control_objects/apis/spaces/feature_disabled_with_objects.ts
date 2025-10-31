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
  const esArchiver = getService('esArchiver');

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

  describe('access control saved objects - feature disabled with existing owned objects', () => {
    before(async () => {
      await esArchiver.load(
        'x-pack/platform/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/access_control'
      );
    });
    after(async () => {
      await esArchiver.unload(
        'x-pack/platform/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/access_control'
      );
    });

    describe('#update', () => {
      it('should be able to update an existing owned object', async () => {
        const { cookie: testUserCookie } = await login('test_user', 'changeme');
        const response = await supertestWithoutAuth
          .get('/access_control_objects/_find')
          .set('kbn-xsrf', 'true')
          .set('cookie', testUserCookie.cookieString())
          .expect(200);
        console.log(JSON.stringify(response.body, null, 2));
      });
    });
  });
}
