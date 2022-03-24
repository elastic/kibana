/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INITIAL_APP_DATA } from '../../../common/__mocks__';
import { LogicMounter } from '../__mocks__/kea_logic/logic_mounter.test_helper';

jest.mock('../shared/licensing', () => ({
  LicensingLogic: { selectors: { hasPlatinumLicense: () => false } },
}));

import { AppLogic } from './app_logic';

describe('AppLogic', () => {
  const { mount } = new LogicMounter(AppLogic);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const DEFAULT_VALUES = {
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
    myRole: {},
  };

  it('sets values from props', () => {
    mount({}, DEFAULT_INITIAL_APP_DATA);

    expect(AppLogic.values).toEqual({
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
        mount({}, { ...DEFAULT_INITIAL_APP_DATA, appSearch: { onboardingComplete: false } });

        AppLogic.actions.setOnboardingComplete();
        expect(AppLogic.values).toEqual({
          ...DEFAULT_VALUES,
          account: {
            onboardingComplete: true,
          },
        });
      });
    });
  });

  describe('selectors', () => {
    describe('myRole', () => {
      it('falls back to an empty object if role is missing', () => {
        mount({}, { ...DEFAULT_INITIAL_APP_DATA, appSearch: {} });

        expect(AppLogic.values).toEqual({
          ...DEFAULT_VALUES,
          account: {},
          myRole: {},
        });
      });
    });
  });
});
