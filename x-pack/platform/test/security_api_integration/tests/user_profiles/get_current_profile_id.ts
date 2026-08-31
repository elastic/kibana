/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
import { expect } from 'expect';
import type { Cookie } from 'tough-cookie';

import { findSessionCookie } from '@kbn/security-api-integration-helpers';

import type { FtrProviderContext } from '../../ftr_provider_context';

// `getCurrentProfileId` isn't exposed as a production HTTP route (the profile UID is also available via
// `/internal/security/me`), so this suite drives it through the `user_profiles_consumer` test plugin, which
// exposes `security.userProfiles.getCurrentProfileId` at this endpoint.
const CURRENT_PROFILE_ID_PATH = '/internal/user_profiles_consumer/_current_profile_id';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('Getting the profile ID for the current user', () => {
    const testUserName = 'user_with_profile_id';
    const testUserPassword = 'changeme';
    const testRoleName = 'test_role_profile_id';
    let sessionCookie: Cookie | undefined;
    let apiKey: SecurityCreateApiKeyResponse;

    async function login() {
      const response = await supertestWithoutAuth
        .post('/internal/security/login')
        .set('kbn-xsrf', 'xxx')
        .send({
          providerType: 'basic',
          providerName: 'basic',
          currentURL: '/',
          params: { username: testUserName, password: testUserPassword },
        })
        .expect(200);
      return findSessionCookie(response.headers['set-cookie']);
    }

    before(async () => {
      // This role is required...
      // 1. So the test user can create an API key to use during testing
      // 2. So the API key the user creates is able to get it's own information (e.g. associated profile UID)
      await security.role.create(testRoleName, {
        elasticsearch: { cluster: ['manage_own_api_key', 'read_security'] },
      });
      await security.user.create(testUserName, {
        password: testUserPassword,
        roles: [`viewer`, testRoleName],
        full_name: 'User With Profile Id',
        email: 'user_with_profile_id@get_current_profile_id_test',
      });

      sessionCookie = await login();

      const response = await supertestWithoutAuth
        .post('/internal/security/api_key')
        .set('Cookie', sessionCookie!.cookieString())
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'test-profile-id-api-key', role_descriptors: {} })
        .expect(200);
      apiKey = response.body;
    });

    after(async () => {
      await security.user.delete(testUserName);
      await security.role.delete(testRoleName);
    });

    it('with session', async () => {
      const { body: currentProfileId } = await supertestWithoutAuth
        .get(CURRENT_PROFILE_ID_PATH)
        .set('Cookie', sessionCookie!.cookieString())
        .expect(200);

      // The resolved ID must match the UID returned by the full-profile `getCurrent` endpoint and the
      // `profile_uid` returned by `/internal/security/me` (both are backed by the same session).
      const { body: fullProfile } = await supertestWithoutAuth
        .get('/internal/security/user_profile')
        .set('Cookie', sessionCookie!.cookieString())
        .expect(200);
      const { body: userWithProfileId } = await supertestWithoutAuth
        .get('/internal/security/me')
        .set('Cookie', sessionCookie!.cookieString())
        .expect(200);

      expect(currentProfileId.profileId).toEqual(expect.any(String));
      expect(currentProfileId.profileId).toBe(fullProfile.uid);
      expect(currentProfileId.profileId).toBe(userWithProfileId.profile_uid);
    });

    it('with basic auth', async () => {
      const authHeaderValue = `Basic ${Buffer.from(`${testUserName}:${testUserPassword}`).toString(
        'base64'
      )}`;

      const { body: currentProfileId } = await supertestWithoutAuth
        .get(CURRENT_PROFILE_ID_PATH)
        .set('Authorization', authHeaderValue)
        .expect(200);

      const { body: fullProfile } = await supertestWithoutAuth
        .get('/internal/security/user_profile')
        .set('Authorization', authHeaderValue)
        .expect(200);

      expect(currentProfileId.profileId).toEqual(expect.any(String));
      expect(currentProfileId.profileId).toBe(fullProfile.uid);
    });

    it('with API key', async () => {
      const authHeaderValue = `apikey ${apiKey.encoded}`;

      const { body: currentProfileId } = await supertestWithoutAuth
        .get(CURRENT_PROFILE_ID_PATH)
        .set('Authorization', authHeaderValue)
        .expect(200);

      const { body: fullProfile } = await supertestWithoutAuth
        .get('/internal/security/user_profile')
        .set('Authorization', authHeaderValue)
        .expect(200);

      expect(currentProfileId.profileId).toEqual(expect.any(String));
      expect(currentProfileId.profileId).toBe(fullProfile.uid);
    });

    it('returns `null` with basic auth when es-security-runas-user header is present', async () => {
      const authHeaderValue = `Basic ${Buffer.from(`${testUserName}:${testUserPassword}`).toString(
        'base64'
      )}`;

      const { body } = await supertestWithoutAuth
        .get(CURRENT_PROFILE_ID_PATH)
        .set('Authorization', authHeaderValue)
        .set('es-security-runas-user', testUserName)
        .expect(200);

      expect(body.profileId).toBeNull();
    });

    it('returns `null` with API key when es-security-runas-user header is present', async () => {
      const { body } = await supertestWithoutAuth
        .get(CURRENT_PROFILE_ID_PATH)
        .set('Authorization', `apikey ${apiKey.encoded}`)
        .set('es-security-runas-user', testUserName)
        .expect(200);

      expect(body.profileId).toBeNull();
    });
  });
}
