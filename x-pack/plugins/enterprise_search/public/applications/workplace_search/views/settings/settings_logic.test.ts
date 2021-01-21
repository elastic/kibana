/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogicMounter } from '../../../__mocks__/kea.mock';

import {
  mockFlashMessageHelpers,
  mockHttpValues,
  expectedAsyncError,
  mockKibanaValues,
} from '../../../__mocks__';

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
        const promise = Promise.resolve(configuredSources);
        http.get.mockReturnValue(promise);
        SettingsLogic.actions.initializeSettings();

        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/org/settings');
        await promise;
        expect(setServerPropsSpy).toHaveBeenCalledWith(configuredSources);
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        http.get.mockReturnValue(promise);
        SettingsLogic.actions.initializeSettings();
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });

    describe('initializeConnectors', () => {
      it('calls API and sets values', async () => {
        const onInitializeConnectorsSpy = jest.spyOn(
          SettingsLogic.actions,
          'onInitializeConnectors'
        );
        const promise = Promise.resolve(serverProps);
        http.get.mockReturnValue(promise);
        SettingsLogic.actions.initializeConnectors();

        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/org/settings/connectors');
        await promise;
        expect(onInitializeConnectorsSpy).toHaveBeenCalledWith(serverProps);
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        http.get.mockReturnValue(promise);
        SettingsLogic.actions.initializeConnectors();
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });

    describe('updateOrgName', () => {
      it('calls API and sets values', async () => {
        const NAME = 'updated name';
        SettingsLogic.actions.onOrgNameInputChange(NAME);
        const setUpdatedNameSpy = jest.spyOn(SettingsLogic.actions, 'setUpdatedName');
        const promise = Promise.resolve({ organizationName: NAME });
        http.put.mockReturnValue(promise);

        SettingsLogic.actions.updateOrgName();

        expect(http.put).toHaveBeenCalledWith('/api/workplace_search/org/settings/customize', {
          body: JSON.stringify({ name: NAME }),
        });
        await promise;
        expect(setSuccessMessage).toHaveBeenCalledWith(ORG_UPDATED_MESSAGE);
        expect(setUpdatedNameSpy).toHaveBeenCalledWith({ organizationName: NAME });
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        http.put.mockReturnValue(promise);
        SettingsLogic.actions.updateOrgName();

        await expectedAsyncError(promise);
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
        const promise = Promise.resolve({ oauthApplication });
        http.put.mockReturnValue(promise);
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
        await promise;
        expect(setUpdatedOauthApplicationSpy).toHaveBeenCalledWith({ oauthApplication });
        expect(setSuccessMessage).toHaveBeenCalledWith(OAUTH_APP_UPDATED_MESSAGE);
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        http.put.mockReturnValue(promise);
        SettingsLogic.actions.updateOauthApplication();
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });

    describe('deleteSourceConfig', () => {
      const SERVICE_TYPE = 'github';
      const NAME = 'baz';

      it('calls API and sets values', async () => {
        const promise = Promise.resolve({});
        http.delete.mockReturnValue(promise);
        SettingsLogic.actions.deleteSourceConfig(SERVICE_TYPE, NAME);

        await promise;
        expect(navigateToUrl).toHaveBeenCalledWith('/settings/connectors');
        expect(setQueuedSuccessMessage).toHaveBeenCalled();
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        http.delete.mockReturnValue(promise);
        SettingsLogic.actions.deleteSourceConfig(SERVICE_TYPE, NAME);
        await expectedAsyncError(promise);

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
