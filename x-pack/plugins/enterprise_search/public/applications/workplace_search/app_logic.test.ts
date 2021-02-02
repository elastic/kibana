/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogicMounter } from '../__mocks__';

import { DEFAULT_INITIAL_APP_DATA } from '../../../common/__mocks__';
import { AppLogic } from './app_logic';

describe('AppLogic', () => {
  const { mount } = new LogicMounter(AppLogic);

  beforeEach(() => {
    mount();
  });

  const DEFAULT_VALUES = {
    account: {},
    hasInitialized: false,
    isFederatedAuth: true,
    isOrganization: false,
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
    isOrganization: false,
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

  describe('setContext()', () => {
    it('sets context', () => {
      AppLogic.actions.setContext(true);

      expect(AppLogic.values.isOrganization).toEqual(true);
    });
  });
});
