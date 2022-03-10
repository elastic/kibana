/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INITIAL_APP_DATA } from '../../../../../common/__mocks__';

import { getRoleAbilities } from './';

describe('getRoleAbilities', () => {
  const mockRole = DEFAULT_INITIAL_APP_DATA.appSearch.role as any;

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
      canManageMetaEngines: true,
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
      const role = {
        ...mockRole,
        ability: { view: [], manage: ['account_settings'] },
      };

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

  describe('canManageMetaEngines', () => {
    const canManageEngines = { ability: { manage: ['account_engines'] } };

    it('returns true when the user can manage any engines and the account has a platinum license', () => {
      const myRole = getRoleAbilities({ ...mockRole, ...canManageEngines });

      expect(myRole.canManageMetaEngines).toEqual(true);
    });

    it('returns true when the user can manage any engines but the account does not have a platinum license', () => {
      const myRole = getRoleAbilities({ ...mockRole, ...canManageEngines });

      expect(myRole.canManageMetaEngines).toEqual(true);
    });

    it('returns false when has a platinum license but the user cannot manage any engines', () => {
      const myRole = getRoleAbilities({ ...mockRole, ability: { manage: [] } });

      expect(myRole.canManageMetaEngines).toEqual(false);
    });
  });
});
