/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_INITIAL_APP_DATA } from '../../../../../common/__mocks__';

import { getRoleAbilities } from './';

describe('getRoleAbilities', () => {
  const mockRole = DEFAULT_INITIAL_APP_DATA.appSearch.role;

  it('transforms server role data into a flat role obj with helper shorthands', () => {
    expect(getRoleAbilities(mockRole)).toEqual({
      id: 'account_id:somestring|user_oid:somestring',
      roleType: 'owner',
      availableRoleTypes: ['owner', 'admin'],
      credentialTypes: ['admin', 'private', 'search'],
      canAccessAllEngines: true,
      can: expect.any(Function),
      // Has access
      canViewAccountCredentials: true,
      canManageEngines: true,
      // Does not have access
      canViewMetaEngines: false,
      canViewEngineAnalytics: false,
      canViewEngineApiLogs: false,
      canViewEngineCrawler: false,
      canViewEngineCredentials: false,
      canViewEngineDocuments: false,
      canViewEngineSchema: false,
      canViewEngineQueryTester: false,
      canViewMetaEngineSourceEngines: false,
      canViewSettings: false,
      canViewRoleMappings: false,
      canManageMetaEngines: false,
      canManageLogSettings: false,
      canManageSettings: false,
      canManageEngineCrawler: false,
      canManageEngineDocuments: false,
      canManageEngineSynonyms: false,
      canManageEngineCredentials: false,
      canManageEngineCurations: false,
      canManageEngineRelevanceTuning: false,
      canManageEngineSearchUi: false,
      canManageEngineResultSettings: false,
      canManageEngineSchema: false,
      canManageMetaEngineSourceEngines: false,
    });
  });

  describe('can()', () => {
    it('sets view abilities to true if manage abilities are true', () => {
      const role = { ...mockRole };
      role.ability.view = [];
      role.ability.manage = ['account_settings'];

      const myRole = getRoleAbilities(role);

      expect(myRole.canViewSettings).toEqual(true);
      expect(myRole.canManageSettings).toEqual(true);
    });

    it('returns false for invalid actions & subjects', () => {
      const myRole = getRoleAbilities(mockRole);

      expect(myRole.can('hello' as any, 'world')).toEqual(false);
      expect(myRole.can('edit', 'fakeSubject')).toEqual(false);
    });
  });
});
