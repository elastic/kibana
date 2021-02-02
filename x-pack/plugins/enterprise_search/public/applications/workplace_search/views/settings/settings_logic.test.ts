/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogicMounter } from '../../../__mocks__/kea.mock';

import { mockFlashMessageHelpers, mockHttpValues, mockKibanaValues } from '../../../__mocks__';

import { nextTick } from '@kbn/test/jest';

import { configuredSources, oauthApplication } from '../../__mocks__/content_sources.mock';

import { ORG_UPDATED_MESSAGE, OAUTH_APP_UPDATED_MESSAGE } from '../../constants';
import { SettingsLogic } from './settings_logic';

describe('SettingsLogic', () => {
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const {
    clearFlashMessages,
    flashAPIErrors,
    setSuccessMessage,
    setQueuedSuccessMessage,
  } = mockFlashMessageHelpers;
  const { mount } = new LogicMounter(SettingsLogic);
  const ORG_NAME = 'myOrg';
  const defaultValues = {
    dataLoading: true,
    connectors: [],
    orgNameInputValue: '',
    oauthApplication: null,
  };
  const serverProps = { organizationName: ORG_NAME, oauthApplication };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(SettingsLogic.values).toEqual(defaultValues);
  });

  describe('actions', () => {
    it('onInitializeConnectors', () => {
      SettingsLogic.actions.onInitializeConnectors(configuredSources);
    });

    it('onOrgNameInputChange', () => {
      const NAME = 'foo';
      SettingsLogic.actions.onOrgNameInputChange(NAME);

      expect(SettingsLogic.values.orgNameInputValue).toEqual(NAME);
    });

    it('setUpdatedName', () => {
      const NAME = 'bar';
      SettingsLogic.actions.setUpdatedName({ organizationName: NAME });

      expect(SettingsLogic.values.orgNameInputValue).toEqual(NAME);
    });

    it('setServerProps', () => {
      SettingsLogic.actions.setServerProps(serverProps);

      expect(SettingsLogic.values.orgNameInputValue).toEqual(ORG_NAME);
      expect(SettingsLogic.values.oauthApplication).toEqual(oauthApplication);
    });

    it('setOauthApplication', () => {
      SettingsLogic.actions.setOauthApplication(oauthApplication);

      expect(SettingsLogic.values.oauthApplication).toEqual(oauthApplication);
    });

    it('setUpdatedOauthApplication', () => {
      SettingsLogic.actions.setUpdatedOauthApplication({ oauthApplication });

      expect(SettingsLogic.values.oauthApplication).toEqual(oauthApplication);
    });
  });

  describe('listeners', () => {
    describe('initializeSettings', () => {
      it('calls API and sets values', async () => {
        const setServerPropsSpy = jest.spyOn(SettingsLogic.actions, 'setServerProps');
        http.get.mockReturnValue(Promise.resolve(configuredSources));
        SettingsLogic.actions.initializeSettings();

        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/org/settings');
        await nextTick();
        expect(setServerPropsSpy).toHaveBeenCalledWith(configuredSources);
      });

      it('handles error', async () => {
        http.get.mockReturnValue(Promise.reject('this is an error'));
        SettingsLogic.actions.initializeSettings();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });

    describe('initializeConnectors', () => {
      it('calls API and sets values', async () => {
        const onInitializeConnectorsSpy = jest.spyOn(
          SettingsLogic.actions,
          'onInitializeConnectors'
        );
        http.get.mockReturnValue(Promise.resolve(serverProps));
        SettingsLogic.actions.initializeConnectors();

        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/org/settings/connectors');
        await nextTick();
        expect(onInitializeConnectorsSpy).toHaveBeenCalledWith(serverProps);
      });

      it('handles error', async () => {
        http.get.mockReturnValue(Promise.reject('this is an error'));
        SettingsLogic.actions.initializeConnectors();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });

    describe('updateOrgName', () => {
      it('calls API and sets values', async () => {
        const NAME = 'updated name';
        SettingsLogic.actions.onOrgNameInputChange(NAME);
        const setUpdatedNameSpy = jest.spyOn(SettingsLogic.actions, 'setUpdatedName');
        http.put.mockReturnValue(Promise.resolve({ organizationName: NAME }));

        SettingsLogic.actions.updateOrgName();

        expect(http.put).toHaveBeenCalledWith('/api/workplace_search/org/settings/customize', {
          body: JSON.stringify({ name: NAME }),
        });
        await nextTick();
        expect(setSuccessMessage).toHaveBeenCalledWith(ORG_UPDATED_MESSAGE);
        expect(setUpdatedNameSpy).toHaveBeenCalledWith({ organizationName: NAME });
      });

      it('handles error', async () => {
        http.put.mockReturnValue(Promise.reject('this is an error'));
        SettingsLogic.actions.updateOrgName();

        await nextTick();
        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });

    describe('updateOauthApplication', () => {
      it('calls API and sets values', async () => {
        const { name, redirectUri, confidential } = oauthApplication;
        const setUpdatedOauthApplicationSpy = jest.spyOn(
          SettingsLogic.actions,
          'setUpdatedOauthApplication'
        );
        http.put.mockReturnValue(Promise.resolve({ oauthApplication }));
        SettingsLogic.actions.setOauthApplication(oauthApplication);
        SettingsLogic.actions.updateOauthApplication();

        expect(clearFlashMessages).toHaveBeenCalled();

        expect(http.put).toHaveBeenCalledWith(
          '/api/workplace_search/org/settings/oauth_application',
          {
            body: JSON.stringify({
              oauth_application: { name, confidential, redirect_uri: redirectUri },
            }),
          }
        );
        await nextTick();
        expect(setUpdatedOauthApplicationSpy).toHaveBeenCalledWith({ oauthApplication });
        expect(setSuccessMessage).toHaveBeenCalledWith(OAUTH_APP_UPDATED_MESSAGE);
      });

      it('handles error', async () => {
        http.put.mockReturnValue(Promise.reject('this is an error'));
        SettingsLogic.actions.updateOauthApplication();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });

    describe('deleteSourceConfig', () => {
      const SERVICE_TYPE = 'github';
      const NAME = 'baz';

      it('calls API and sets values', async () => {
        http.delete.mockReturnValue(Promise.resolve({}));
        SettingsLogic.actions.deleteSourceConfig(SERVICE_TYPE, NAME);

        await nextTick();
        expect(navigateToUrl).toHaveBeenCalledWith('/settings/connectors');
        expect(setQueuedSuccessMessage).toHaveBeenCalled();
      });

      it('handles error', async () => {
        http.delete.mockReturnValue(Promise.reject('this is an error'));
        SettingsLogic.actions.deleteSourceConfig(SERVICE_TYPE, NAME);
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });

    it('resetSettingsState', () => {
      // needed to set dataLoading to false
      SettingsLogic.actions.onInitializeConnectors(configuredSources);
      SettingsLogic.actions.resetSettingsState();

      expect(clearFlashMessages).toHaveBeenCalled();
      expect(SettingsLogic.values.dataLoading).toEqual(true);
    });
  });
});
