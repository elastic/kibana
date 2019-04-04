/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

import {
  CONFIG_DASHBOARD_ONLY_MODE_ROLES,
  AUTH_SCOPE_DASHBORD_ONLY_MODE,
} from '../../common';

import {
  getDashboardModeAuthScope
} from '../dashboard_mode_auth_scope';

describe('getDashboardModeAuthScope()', () => {
  async function test({ userRoles, dashRoles, expected }) {
    const request = {
      getUiSettingsService() {
        return {
          async get(key) {
            expect(key).to.equal(CONFIG_DASHBOARD_ONLY_MODE_ROLES);
            return dashRoles;
          }
        };
      }
    };

    const user = {
      roles: userRoles
    };

    const result = await getDashboardModeAuthScope(request, user);
    expect(result).to.eql(expected);
  }

  describe('returns tag when', () => {
    it('all roles are dashboardOnlyModeRoles', async () => {
      await test({
        userRoles: ['dash-only-role', 'another-limited-role'],
        dashRoles: ['dash-only-role', 'another-limited-role'],
        expected: [AUTH_SCOPE_DASHBORD_ONLY_MODE]
      });
    });

    it('one role is not in dashboard mode', async () => {
      await test({
        userRoles: ['dash-only-role', 'another-limited-role', 'a-super-role'],
        dashRoles: ['dash-only-role', 'another-limited-role'],
        expected: [AUTH_SCOPE_DASHBORD_ONLY_MODE]
      });
    });
  });

  describe('does not return tag when', () => {
    it('no roles are in dashboard mode', async () => {
      await test({
        userRoles: ['super-role', 'a-super-role'],
        dashRoles: ['dash-only-role', 'another-limited-role'],
        expected: undefined
      });
    });

    it('one role is in dashboard mode and the user has superuser privileges', async () => {
      await test({
        userRoles: ['dash-only-role', 'another-limited-role', 'superuser'],
        dashRoles: ['dash-only-role', 'another-limited-role'],
        expected: undefined
      });
    });

    it('the user has no roles', async () => {
      await test({
        userRoles: [],
        dashRoles: ['dash-only-role'],
        expected: undefined
      });
    });

    it('no dash roles', async () => {
      await test({
        userRoles: ['dash-only-role'],
        dashRoles: [],
        expected: undefined
      });
    });

    it('when no roles are in dashboard mode and user has no roles', async () => {
      await test({
        userRoles: [],
        dashRoles: [],
        expected: undefined
      });
    });
  });
});
