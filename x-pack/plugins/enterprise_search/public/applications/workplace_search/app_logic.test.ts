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
    account: {},
    hasInitialized: false,
    isFederatedAuth: true,
    organization: {},
  };

  const expectedLogicValues = {
    account: {
      canCreateInvitations: true,
      canCreatePersonalSources: true,
      groups: ['Default', 'Cats'],
      id: 'some-id-string',
      isAdmin: true,
      isCurated: false,
      viewedOnboardingPage: true,
    },
    hasInitialized: true,
    isFederatedAuth: false,
    organization: {
      defaultOrgName: 'My Organization',
      name: 'ACME Donuts',
    },
  };

  it('has expected default values', () => {
    expect(AppLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('initializeAppData()', () => {
    it('sets values based on passed props', () => {
      AppLogic.actions.initializeAppData(DEFAULT_INITIAL_APP_DATA);

      expect(AppLogic.values).toEqual(expectedLogicValues);
    });

    it('gracefully handles missing initial data', () => {
      AppLogic.actions.initializeAppData({});

      expect(AppLogic.values).toEqual({
        ...DEFAULT_VALUES,
        hasInitialized: true,
        isFederatedAuth: false,
      });
    });
  });
});
