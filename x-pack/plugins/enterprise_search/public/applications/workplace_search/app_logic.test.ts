/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INITIAL_APP_DATA } from '../../../common/__mocks__';
import { LogicMounter } from '../__mocks__/kea_logic';

import { AppLogic } from './app_logic';

describe('AppLogic', () => {
  const { mount } = new LogicMounter(AppLogic);

  beforeEach(() => {
    mount();
  });

  const DEFAULT_VALUES = {
    account: {},
    hasInitialized: false,
    isOrganization: false,
    searchOAuth: {},
    organization: {},
  };

  const expectedLogicValues = {
    account: {
      canCreatePrivateSources: true,
      groups: ['Default', 'Cats'],
      id: 'some-id-string',
      isAdmin: true,
      viewedOnboardingPage: true,
    },
    hasInitialized: true,
    isOrganization: false,
    searchOAuth: {
      clientId: 'someUID',
      redirectUrl: 'http://localhost:3002/ws/search_callback',
    },
    organization: {
      defaultOrgName: 'My Organization',
      name: 'ACME Donuts',
    },
  };

  it('has expected default values', () => {
    expect(AppLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('initializeAppData', () => {
    it('sets values based on passed props', () => {
      AppLogic.actions.initializeAppData(DEFAULT_INITIAL_APP_DATA);

      expect(AppLogic.values).toEqual(expectedLogicValues);
    });

    it('gracefully handles missing initial data', () => {
      AppLogic.actions.initializeAppData({});

      expect(AppLogic.values).toEqual({
        ...DEFAULT_VALUES,
        hasInitialized: true,
      });
    });
  });

  describe('setContext', () => {
    it('sets context', () => {
      AppLogic.actions.setContext(true);
      expect(AppLogic.values).toEqual({
        ...DEFAULT_VALUES,
        isOrganization: true,
      });
    });
  });

  describe('setSourceRestriction', () => {
    it('sets property', () => {
      mount(DEFAULT_INITIAL_APP_DATA);
      AppLogic.actions.setSourceRestriction(true);

      expect(AppLogic.values).toEqual({
        ...DEFAULT_VALUES,
        searchOAuth: DEFAULT_INITIAL_APP_DATA.searchOAuth,
        account: {
          canCreatePrivateSources: true,
        },
      });
    });
  });

  describe('setOrgName', () => {
    it('sets property', () => {
      const NAME = 'new name';
      mount(DEFAULT_INITIAL_APP_DATA);
      AppLogic.actions.setOrgName(NAME);

      expect(AppLogic.values).toEqual({
        ...DEFAULT_VALUES,
        searchOAuth: DEFAULT_INITIAL_APP_DATA.searchOAuth,
        organization: {
          name: NAME,
        },
      });
    });
  });
});
