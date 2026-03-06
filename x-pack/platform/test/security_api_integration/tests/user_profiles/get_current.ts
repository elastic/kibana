/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityCreateApiKeyResponse } from '@elastic/elasticsearch/lib/api/types';
import { expect } from 'expect';
import type { Cookie } from 'tough-cookie';
import { parse as parseCookie } from 'tough-cookie';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('Getting user profile for the current user', () => {
    const testUserName = 'user_with_profile';
    const testUserPassword = 'changeme';
    const testRoleName = 'test_role_api_key';
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
      return parseCookie(response.headers['set-cookie'][0])!;
    }

    before(async () => {
      // This role is required...
      // 1. So the test user can create an API key to use during testing
      // 2. So the API key the user creates is able to get it's own information (e.g. associated profile UID)
      await security.role.create(testRoleName, {
        elasticsearch: { cluster: ['manage_own_api_key', 'read_security'] },
      });
      await security.user.create(testUserName, {
        password: 'changeme',
        roles: [`viewer`, testRoleName],
        full_name: 'User With Profile',
        email: 'user_with_profile@get_current_test',
      });

      sessionCookie = await login();

      const response = await supertestWithoutAuth
        .post('/internal/security/api_key')
        .set('Cookie', sessionCookie!.cookieString())
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'test-api-key', role_descriptors: {} })
        .expect(200);
      apiKey = response.body;

      await supertestWithoutAuth
        .post('/internal/security/user_profile/_data')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', sessionCookie!.cookieString())
        .send({
          avatar: { initials: 'some-initials', color: '#f3f3f3' },
          userSettings: { darkMode: 'dark', contrastMode: 'high' },
        })
        .expect(200);
    });

    after(async () => {
      await security.user.delete(testUserName);
      await security.role.delete('test_role_api_key');
    });

    it('with session', async () => {
      const { body: profileWithoutData } = await supertestWithoutAuth
        .get('/internal/security/user_profile')
        .set('Cookie', sessionCookie!.cookieString())
        .expect(200);
      const { body: profileWithAllData } = await supertestWithoutAuth
        .get('/internal/security/user_profile?dataPath=*')
        .set('Cookie', sessionCookie!.cookieString())
        .expect(200);
      const { body: profileWithSomeData } = await supertestWithoutAuth
        .get('/internal/security/user_profile?dataPath=some')
        .set('Cookie', sessionCookie!.cookieString())
        .expect(200);
      const { body: userWithProfileId } = await supertestWithoutAuth
        .get('/internal/security/me')
        .set('Cookie', sessionCookie!.cookieString())
        .expect(200);

      // Profile UID is supposed to be stable.
      expectSnapshot(profileWithoutData).toMatchInline(`
        Object {
          "data": Object {},
          "enabled": true,
          "labels": Object {},
          "uid": "u_K1WXIRQbRoHiuJylXp842IEhAO_OdqT7SDHrJSzUIjU_0",
          "user": Object {
            "authentication_provider": Object {
              "name": "basic",
              "type": "basic",
            },
            "email": "user_with_profile@get_current_test",
            "full_name": "User With Profile",
            "realm_name": "default_native",
            "roles": Array [
              "viewer",
              "test_role_api_key",
            ],
            "username": "user_with_profile",
          },
        }
      `);
      expectSnapshot(profileWithAllData).toMatchInline(`
        Object {
          "data": Object {
            "avatar": Object {
              "color": "#f3f3f3",
              "imageUrl": null,
              "initials": "some-initials",
            },
            "userSettings": Object {
              "contrastMode": "high",
              "darkMode": "dark",
            },
          },
          "enabled": true,
          "labels": Object {},
          "uid": "u_K1WXIRQbRoHiuJylXp842IEhAO_OdqT7SDHrJSzUIjU_0",
          "user": Object {
            "authentication_provider": Object {
              "name": "basic",
              "type": "basic",
            },
            "email": "user_with_profile@get_current_test",
            "full_name": "User With Profile",
            "realm_name": "default_native",
            "roles": Array [
              "viewer",
              "test_role_api_key",
            ],
            "username": "user_with_profile",
          },
        }
      `);
      expectSnapshot(profileWithSomeData).toMatchInline(`
        Object {
          "data": Object {},
          "enabled": true,
          "labels": Object {},
          "uid": "u_K1WXIRQbRoHiuJylXp842IEhAO_OdqT7SDHrJSzUIjU_0",
          "user": Object {
            "authentication_provider": Object {
              "name": "basic",
              "type": "basic",
            },
            "email": "user_with_profile@get_current_test",
            "full_name": "User With Profile",
            "realm_name": "default_native",
            "roles": Array [
              "viewer",
              "test_role_api_key",
            ],
            "username": "user_with_profile",
          },
        }
      `);
      expect(userWithProfileId.profile_uid).toBe('u_K1WXIRQbRoHiuJylXp842IEhAO_OdqT7SDHrJSzUIjU_0');
    });

    it('with basic auth', async () => {
      const authHeaderValue = `Basic ${Buffer.from(`${testUserName}:${testUserPassword}`).toString(
        'base64'
      )}`;

      const { body: profileWithoutData } = await supertestWithoutAuth
        .get('/internal/security/user_profile')
        .set('Authorization', authHeaderValue)
        .expect(200);
      const { body: profileWithAllData } = await supertestWithoutAuth
        .get('/internal/security/user_profile?dataPath=*')
        .set('Authorization', authHeaderValue)
        .expect(200);
      const { body: profileWithSomeData } = await supertestWithoutAuth
        .get('/internal/security/user_profile?dataPath=some')
        .set('Authorization', authHeaderValue)
        .expect(200);
      const { body: userWithProfileId } = await supertestWithoutAuth
        .get('/internal/security/me')
        .set('Authorization', authHeaderValue)
        .expect(200);

      // Profile UID is supposed to be stable.
      expectSnapshot(profileWithoutData).toMatchInline(`
        Object {
          "data": Object {},
          "enabled": true,
          "labels": Object {},
          "uid": "u_K1WXIRQbRoHiuJylXp842IEhAO_OdqT7SDHrJSzUIjU_0",
          "user": Object {
            "authentication_provider": Object {
              "name": "__http__",
              "type": "http",
            },
            "email": "user_with_profile@get_current_test",
            "full_name": "User With Profile",
            "realm_name": "default_native",
            "roles": Array [
              "viewer",
              "test_role_api_key",
            ],
            "username": "user_with_profile",
          },
        }
      `);
      expectSnapshot(profileWithAllData).toMatchInline(`
        Object {
          "data": Object {
            "avatar": Object {
              "color": "#f3f3f3",
              "imageUrl": null,
              "initials": "some-initials",
            },
            "userSettings": Object {
              "contrastMode": "high",
              "darkMode": "dark",
            },
          },
          "enabled": true,
          "labels": Object {},
          "uid": "u_K1WXIRQbRoHiuJylXp842IEhAO_OdqT7SDHrJSzUIjU_0",
          "user": Object {
            "authentication_provider": Object {
              "name": "__http__",
              "type": "http",
            },
            "email": "user_with_profile@get_current_test",
            "full_name": "User With Profile",
            "realm_name": "default_native",
            "roles": Array [
              "viewer",
              "test_role_api_key",
            ],
            "username": "user_with_profile",
          },
        }
      `);
      expectSnapshot(profileWithSomeData).toMatchInline(`
        Object {
          "data": Object {},
          "enabled": true,
          "labels": Object {},
          "uid": "u_K1WXIRQbRoHiuJylXp842IEhAO_OdqT7SDHrJSzUIjU_0",
          "user": Object {
            "authentication_provider": Object {
              "name": "__http__",
              "type": "http",
            },
            "email": "user_with_profile@get_current_test",
            "full_name": "User With Profile",
            "realm_name": "default_native",
            "roles": Array [
              "viewer",
              "test_role_api_key",
            ],
            "username": "user_with_profile",
          },
        }
      `);
      expect(userWithProfileId.profile_uid).toBeUndefined(); // The /me endpoint is only applicable with an active session
    });

    it('with API key', async () => {
      const authHeaderValue = `apikey ${apiKey.encoded}`;

      const { body: profileWithoutData } = await supertestWithoutAuth
        .get('/internal/security/user_profile')
        .set('Authorization', authHeaderValue)
        .expect(200);
      const { body: profileWithAllData } = await supertestWithoutAuth
        .get('/internal/security/user_profile?dataPath=*')
        .set('Authorization', authHeaderValue)
        .expect(200);
      const { body: profileWithSomeData } = await supertestWithoutAuth
        .get('/internal/security/user_profile?dataPath=some')
        .set('Authorization', authHeaderValue)
        .expect(200);
      const { body: userWithProfileId } = await supertestWithoutAuth
        .get('/internal/security/me')
        .set('Authorization', authHeaderValue)
        .expect(200);

      // Profile UID is supposed to be stable.
      expectSnapshot(profileWithoutData).toMatchInline(`
        Object {
          "data": Object {},
          "enabled": true,
          "labels": Object {},
          "uid": "u_K1WXIRQbRoHiuJylXp842IEhAO_OdqT7SDHrJSzUIjU_0",
          "user": Object {
            "authentication_provider": Object {
              "name": "__http__",
              "type": "http",
            },
            "email": "user_with_profile@get_current_test",
            "full_name": "User With Profile",
            "realm_name": "default_native",
            "roles": Array [
              "viewer",
              "test_role_api_key",
            ],
            "username": "user_with_profile",
          },
        }
      `);
      expectSnapshot(profileWithAllData).toMatchInline(`
        Object {
          "data": Object {
            "avatar": Object {
              "color": "#f3f3f3",
              "imageUrl": null,
              "initials": "some-initials",
            },
            "userSettings": Object {
              "contrastMode": "high",
              "darkMode": "dark",
            },
          },
          "enabled": true,
          "labels": Object {},
          "uid": "u_K1WXIRQbRoHiuJylXp842IEhAO_OdqT7SDHrJSzUIjU_0",
          "user": Object {
            "authentication_provider": Object {
              "name": "__http__",
              "type": "http",
            },
            "email": "user_with_profile@get_current_test",
            "full_name": "User With Profile",
            "realm_name": "default_native",
            "roles": Array [
              "viewer",
              "test_role_api_key",
            ],
            "username": "user_with_profile",
          },
        }
      `);
      expectSnapshot(profileWithSomeData).toMatchInline(`
        Object {
          "data": Object {},
          "enabled": true,
          "labels": Object {},
          "uid": "u_K1WXIRQbRoHiuJylXp842IEhAO_OdqT7SDHrJSzUIjU_0",
          "user": Object {
            "authentication_provider": Object {
              "name": "__http__",
              "type": "http",
            },
            "email": "user_with_profile@get_current_test",
            "full_name": "User With Profile",
            "realm_name": "default_native",
            "roles": Array [
              "viewer",
              "test_role_api_key",
            ],
            "username": "user_with_profile",
          },
        }
      `);
      expect(userWithProfileId.profile_uid).toBeUndefined(); // The /me endpoint is only applicable with an active session
    });
  });
}
