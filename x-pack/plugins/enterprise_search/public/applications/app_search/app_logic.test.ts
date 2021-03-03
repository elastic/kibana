/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INITIAL_APP_DATA } from '../../../common/__mocks__';

import { resetContext } from 'kea';

import { AppLogic } from './app_logic';

describe('AppLogic', () => {
  const mount = (props = {}) => {
    AppLogic({ ...DEFAULT_INITIAL_APP_DATA, ...props });
    AppLogic.mount();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetContext({});
  });

  it('sets values from props', () => {
    mount();

    expect(AppLogic.values).toEqual({
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

  describe('actions', () => {
    describe('setOnboardingComplete()', () => {
      it('sets true', () => {
        mount({ appSearch: { onboardingComplete: false } });

        AppLogic.actions.setOnboardingComplete();
        expect(AppLogic.values.account.onboardingComplete).toEqual(true);
      });
    });
  });

  describe('selectors', () => {
    describe('myRole', () => {
      it('falls back to an empty object if role is missing', () => {
        mount({ appSearch: {} });

        expect(AppLogic.values.myRole).toEqual({});
      });
    });
  });
});
