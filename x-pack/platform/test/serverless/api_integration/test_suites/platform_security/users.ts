/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { SupertestWithRoleScopeType } from '../../services';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const roleScopedSupertest = getService('roleScopedSupertest');
  let supertestAdminWithCookieCredentials: SupertestWithRoleScopeType;

  describe('security/users', function () {
    before(async () => {
      supertestAdminWithCookieCredentials = await roleScopedSupertest.getSupertestWithRoleScope(
        'admin',
        {
          useCookieHeader: true,
          withInternalHeaders: true,
        }
      );
    });

    describe('route access', () => {
      describe('internal', () => {
        it('get', async () => {
          const { status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/users/elastic'
          );
          expect(status).not.toBe(404);
        });

        it('get all', async () => {
          const { status } = await supertestAdminWithCookieCredentials.get(
            '/internal/security/users'
          );
          expect(status).not.toBe(404);
        });

        it('create/update', async () => {
          const { status } = await supertestWithoutAuth
            .post(`/internal/security/users/some_testuser`)
            .set(samlAuth.getInternalRequestHeader())
            .send({ username: 'some_testuser', password: 'testpassword', roles: [] });
          expect(status).not.toBe(404);
        });

        it('delete', async () => {
          const { status } = await supertestAdminWithCookieCredentials.delete(
            `/internal/security/users/elastic`
          );
          expect(status).not.toBe(404);
        });

        it('disable', async () => {
          const { status } = await supertestAdminWithCookieCredentials.post(
            `/internal/security/users/elastic/_disable`
          );
          expect(status).not.toBe(404);
        });

        it('enable', async () => {
          const { status } = await supertestAdminWithCookieCredentials.post(
            `/internal/security/users/elastic/_enable`
          );
          expect(status).not.toBe(404);
        });

        it('set password', async () => {
          const { status } = await supertestWithoutAuth
            .post(`/internal/security/users/{username}/password`)
            .set(samlAuth.getInternalRequestHeader())
            .send({
              password: 'old_pw',
              newPassword: 'new_pw',
            });
          expect(status).not.toBe(404);
        });
      });
    });
  });
}
