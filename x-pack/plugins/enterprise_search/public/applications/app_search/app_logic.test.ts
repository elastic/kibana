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
        myRole: expect.objectContaining({
          id: 'account_id:somestring|user_oid:somestring',
          roleType: 'owner',
          availableRoleTypes: ['owner', 'admin'],
          credentialTypes: ['admin', 'private', 'search'],
          canAccessAllEngines: true,
          canViewAccountCredentials: true,
          // Truncated for brevity - see utils/role/index.test.ts for full output
        }),
      });
    });

    it('gracefully handles missing initial data', () => {
      AppLogic.actions.initializeAppData({});

      expect(AppLogic.values).toEqual({
        ...DEFAULT_VALUES,
        hasInitialized: true,
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
