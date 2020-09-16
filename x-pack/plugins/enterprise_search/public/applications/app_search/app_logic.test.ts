/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

import { DEFAULT_INITIAL_APP_DATA } from '../../../common/__mocks__';
import { AppLogic } from './app_logic';

describe('AppLogic', () => {
  beforeEach(() => {
    resetContext({});
    AppLogic.mount();
  });

  const DEFAULT_VALUES = {
    hasInitialized: false,
    account: {},
    configuredLimits: {},
    ilmEnabled: false,
    myRole: {},
  };

  it('has expected default values', () => {
    expect(AppLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('initializeAppData()', () => {
    it('sets values based on passed props', () => {
      AppLogic.actions.initializeAppData(DEFAULT_INITIAL_APP_DATA);

      expect(AppLogic.values).toEqual({
        hasInitialized: true,
        ilmEnabled: true,
        configuredLimits: {
          engine: {
            maxDocumentByteSize: 102400,
            maxEnginesPerMetaEngine: 15,
          },
        },
        account: {
          accountId: 'some-id-string',
          onboardingComplete: true,
          role: DEFAULT_INITIAL_APP_DATA.appSearch.role,
        },
        myRole: {
          id: 'account_id:somestring|user_oid:somestring',
          roleType: 'owner',
          availableRoleTypes: ['owner', 'admin'],
          credentialTypes: ['admin', 'private', 'search'],
          canAccessAllEngines: true,
          can: expect.any(Function),
          // Has access
          canViewAccountCredentials: true,
          canViewEngines: true,
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
          canManageEngineReferenceUi: false,
          canManageEngineResultSettings: false,
          canManageEngineSchema: false,
          canManageMetaEngineSourceEngines: false,
        },
      });
    });
  });

  describe('setOnboardingComplete()', () => {
    it('sets true', () => {
      expect(AppLogic.values.account.onboardingComplete).toBeFalsy();
      AppLogic.actions.setOnboardingComplete();
      expect(AppLogic.values.account.onboardingComplete).toEqual(true);
    });
  });
});
