/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Cookie } from 'tough-cookie';
import { parse as parseCookie } from 'tough-cookie';

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('User profiles suggestions', () => {
    const usersSessions = new Map<string, { cookie: Cookie }>();
    before(async () => {
      // 1. Create test roles.
      await security.role.create('role_one', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [
          {
            spaces: ['default'],
            base: [],
            feature: { discover: ['read'], dashboard: ['read'], visualize: ['read'] },
          },
          {
            spaces: ['space-a'],
            base: [],
            feature: { dashboard: ['read'], maps: ['read'] },
          },
        ],
      });

      await security.role.create('role_two', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [
          { spaces: ['default'], base: [], feature: { apm: ['read'], dashboard: ['read'] } },
          {
            spaces: ['space-a'],
            base: [],
            feature: { discover: ['read'], dashboard: ['read'] },
          },
        ],
      });

      await security.role.create('role_three', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [
          {
            spaces: ['default'],
            base: [],
            feature: { maps: ['read'], dashboard: ['read'], visualize: ['read'] },
          },
          {
            spaces: ['space-a'],
            base: [],
            feature: { apm: ['read'], dashboard: ['read'] },
          },
        ],
      });

      // 2. Create test users
      await Promise.all(
        ['one', 'two', 'three'].map((userPrefix) =>
          security.user.create(`user_${userPrefix}`, {
            password: 'changeme',
            roles: [`role_${userPrefix}`],
            full_name: userPrefix.toUpperCase(),
            email: `${userPrefix}@elastic.co`,
          })
        )
      );

      // 3. Activate user profiles (activation time affects the order in which Elasticsearch returns results, that's why
      // we should activate profiles in a predefined order to keep tests as stable as possible).
      for (const userPrefix of ['one', 'two', 'three']) {
        const response = await supertestWithoutAuth
          .post('/internal/security/login')
          .set('kbn-xsrf', 'xxx')
          .send({
            providerType: 'basic',
            providerName: 'basic',
            currentURL: '/',
            params: { username: `user_${userPrefix}`, password: 'changeme' },
          })
          .expect(200);
        usersSessions.set(`user_${userPrefix}`, {
          cookie: parseCookie(response.headers['set-cookie'][0])!,
        });
      }
    });

    after(async () => {
      await Promise.all(
        ['one', 'two', 'three'].flatMap((userPrefix) => [
          security.role.delete(`role_${userPrefix}`),
          security.user.delete(`user_${userPrefix}`),
        ])
      );
    });

    it('can get suggestions in a default space', async () => {
      // 1. No results since user one doesn't have access to `maps` app.
      await supertest
        .post('/internal/user_profiles_consumer/_suggest')
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'one', requiredAppPrivileges: ['maps'] })
        .expect(200, []);

      // 2. One result with user `one` who has access to the `discover` app in a default space.
      let suggestions = await supertest
        .post('/internal/user_profiles_consumer/_suggest')
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'one', requiredAppPrivileges: ['discover'] })
        .expect(200);
      expect(suggestions.body).to.have.length(1);
      expectSnapshot(
        suggestions.body.map(({ user, data }: { user: unknown; data: unknown }) => ({ user, data }))
      ).toMatchInline(`
        Array [
          Object {
            "data": Object {},
            "user": Object {
              "email": "one@elastic.co",
              "full_name": "ONE",
              "username": "user_one",
            },
          },
        ]
      `);

      // 3. Two results with user `one` and `three` who have access to the `dashboards` and `visualize` apps in
      // a default space.
      suggestions = await supertest
        .post('/internal/user_profiles_consumer/_suggest')
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'elastic', requiredAppPrivileges: ['visualize', 'dashboards'] })
        .expect(200);
      expect(suggestions.body).to.have.length(2);
      expectSnapshot(
        suggestions.body.map(({ user, data }: { user: unknown; data: unknown }) => ({ user, data }))
      ).toMatchInline(`
        Array [
          Object {
            "data": Object {},
            "user": Object {
              "email": "one@elastic.co",
              "full_name": "ONE",
              "username": "user_one",
            },
          },
          Object {
            "data": Object {},
            "user": Object {
              "email": "three@elastic.co",
              "full_name": "THREE",
              "username": "user_three",
            },
          },
        ]
      `);
    });

    it('can get suggestions in a custom space', async () => {
      // 1. No results since user one doesn't have access to `discover` app in a custom space.
      await supertest
        .post('/s/space-a/internal/user_profiles_consumer/_suggest')
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'one', requiredAppPrivileges: ['discover'] })
        .expect(200, []);

      // 2. One result with user `one` who has access to the `maps` app in a custom space.
      let suggestions = await supertest
        .post('/s/space-a/internal/user_profiles_consumer/_suggest')
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'one', requiredAppPrivileges: ['maps'] })
        .expect(200);
      expect(suggestions.body).to.have.length(1);
      expectSnapshot(
        suggestions.body.map(({ user, data }: { user: unknown; data: unknown }) => ({ user, data }))
      ).toMatchInline(`
        Array [
          Object {
            "data": Object {},
            "user": Object {
              "email": "one@elastic.co",
              "full_name": "ONE",
              "username": "user_one",
            },
          },
        ]
      `);

      // 3. Three results with user `one`, `two` and `three` who have access to the `dashboards` app in a custom space.
      suggestions = await supertest
        .post('/s/space-a/internal/user_profiles_consumer/_suggest')
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'elastic', requiredAppPrivileges: ['dashboards'] })
        .expect(200);
      expect(suggestions.body).to.have.length(3);
      expectSnapshot(
        suggestions.body.map(({ user, data }: { user: unknown; data: unknown }) => ({ user, data }))
      ).toMatchInline(`
        Array [
          Object {
            "data": Object {},
            "user": Object {
              "email": "two@elastic.co",
              "full_name": "TWO",
              "username": "user_two",
            },
          },
          Object {
            "data": Object {},
            "user": Object {
              "email": "one@elastic.co",
              "full_name": "ONE",
              "username": "user_one",
            },
          },
          Object {
            "data": Object {},
            "user": Object {
              "email": "three@elastic.co",
              "full_name": "THREE",
              "username": "user_three",
            },
          },
        ]
      `);
    });

    it('can limit the amount of returned results', async () => {
      const allAvailableSuggestions = await supertest
        .post('/s/space-a/internal/user_profiles_consumer/_suggest')
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'elastic', size: 10, requiredAppPrivileges: ['dashboards'] })
        .expect(200);
      expect(allAvailableSuggestions.body).to.have.length(3);
      expectSnapshot(
        allAvailableSuggestions.body.map(({ user, data }: { user: unknown; data: unknown }) => ({
          user,
          data,
        }))
      ).toMatchInline(`
        Array [
          Object {
            "data": Object {},
            "user": Object {
              "email": "two@elastic.co",
              "full_name": "TWO",
              "username": "user_two",
            },
          },
          Object {
            "data": Object {},
            "user": Object {
              "email": "one@elastic.co",
              "full_name": "ONE",
              "username": "user_one",
            },
          },
          Object {
            "data": Object {},
            "user": Object {
              "email": "three@elastic.co",
              "full_name": "THREE",
              "username": "user_three",
            },
          },
        ]
      `);

      const singleSuggestion = await supertest
        .post('/s/space-a/internal/user_profiles_consumer/_suggest')
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'elastic', size: 1, requiredAppPrivileges: ['dashboards'] })
        .expect(200);
      expect(singleSuggestion.body).to.have.length(1);
      expectSnapshot(
        singleSuggestion.body.map(({ user, data }: { user: unknown; data: unknown }) => ({
          user,
          data,
        }))
      ).toMatchInline(`
        Array [
          Object {
            "data": Object {},
            "user": Object {
              "email": "two@elastic.co",
              "full_name": "TWO",
              "username": "user_two",
            },
          },
        ]
      `);
    });

    it('can get suggestions with data', async () => {
      // 1. Update user profile data.
      await supertestWithoutAuth
        .post('/internal/security/user_profile/_data')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', usersSessions.get('user_one')!.cookie.cookieString())
        .send({ some: 'data', some_more: 'data', some_nested: { data: 'nested_data' } })
        .expect(200);

      // 2. Data is not returned by default
      let suggestions = await supertest
        .post('/internal/user_profiles_consumer/_suggest')
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'one', requiredAppPrivileges: ['discover'] })
        .expect(200);
      expect(suggestions.body).to.have.length(1);
      expectSnapshot(
        suggestions.body.map(({ user, data }: { user: unknown; data: unknown }) => ({ user, data }))
      ).toMatchInline(`
        Array [
          Object {
            "data": Object {},
            "user": Object {
              "email": "one@elastic.co",
              "full_name": "ONE",
              "username": "user_one",
            },
          },
        ]
      `);

      // 3. Only specific data is returned if requested.
      suggestions = await supertest
        .post('/internal/user_profiles_consumer/_suggest')
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'one', requiredAppPrivileges: ['discover'], dataPath: 'some,some_more' })
        .expect(200);
      expect(suggestions.body).to.have.length(1);
      expectSnapshot(
        suggestions.body.map(({ user, data }: { user: unknown; data: unknown }) => ({ user, data }))
      ).toMatchInline(`
        Array [
          Object {
            "data": Object {
              "some": "data",
              "some_more": "data",
            },
            "user": Object {
              "email": "one@elastic.co",
              "full_name": "ONE",
              "username": "user_one",
            },
          },
        ]
      `);

      // 4. All data is returned if requested.
      suggestions = await supertest
        .post('/internal/user_profiles_consumer/_suggest')
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'one', requiredAppPrivileges: ['discover'], dataPath: '*' })
        .expect(200);
      expect(suggestions.body).to.have.length(1);
      expectSnapshot(
        suggestions.body.map(({ user, data }: { user: unknown; data: unknown }) => ({ user, data }))
      ).toMatchInline(`
        Array [
          Object {
            "data": Object {
              "some": "data",
              "some_more": "data",
              "some_nested": Object {
                "data": "nested_data",
              },
            },
            "user": Object {
              "email": "one@elastic.co",
              "full_name": "ONE",
              "username": "user_one",
            },
          },
        ]
      `);
    });

    it('can get suggestions with hints', async () => {
      const profile = await supertestWithoutAuth
        .get('/internal/security/user_profile')
        .set('kbn-xsrf', 'xxx')
        .set('Cookie', usersSessions.get('user_three')!.cookie.cookieString())
        .expect(200);

      expect(profile.body.uid).not.to.be.empty();

      const suggestions = await supertest
        .post('/internal/user_profiles_consumer/_suggest')
        .set('kbn-xsrf', 'xxx')
        .send({ hint: { uids: [profile.body.uid] } })
        .expect(200);

      // `user_three` should be first in list
      expect(suggestions.body.length).to.be.above(0);
      expectSnapshot(suggestions.body[0].user).toMatchInline(`
        Object {
          "email": "three@elastic.co",
          "full_name": "THREE",
          "username": "user_three",
        }
      `);
    });
  });
}
