/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
  mockKibanaValues,
} from '../../../__mocks__/kea_logic';
import { configuredSources, oauthApplication } from '../../__mocks__/content_sources.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';
import { ORG_UPDATED_MESSAGE, OAUTH_APP_UPDATED_MESSAGE } from '../../constants';

import { SettingsLogic } from './settings_logic';

describe('SettingsLogic', () => {
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { clearFlashMessages, flashSuccessToast } = mockFlashMessageHelpers;
  const { mount } = new LogicMounter(SettingsLogic);
  const ORG_NAME = 'myOrg';
  const defaultValues = {
    dataLoading: true,
    connectors: [],
    orgNameInputValue: '',
    oauthApplication: null,
    icon: null,
    stagedIcon: null,
    logo: null,
    stagedLogo: null,
    logoButtonLoading: false,
    iconButtonLoading: false,
  };
  const serverProps = { organizationName: ORG_NAME, oauthApplication, logo: null, icon: null };

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

    it('setIcon', () => {
      SettingsLogic.actions.setStagedIcon('stagedIcon');
      SettingsLogic.actions.setIcon('icon');

      expect(SettingsLogic.values.icon).toEqual('icon');
      expect(SettingsLogic.values.stagedIcon).toEqual(null);
    });

    it('setStagedIcon', () => {
      SettingsLogic.actions.setStagedIcon('stagedIcon');

      expect(SettingsLogic.values.stagedIcon).toEqual('stagedIcon');
    });

    it('setLogo', () => {
      SettingsLogic.actions.setStagedLogo('stagedLogo');
      SettingsLogic.actions.setLogo('logo');

      expect(SettingsLogic.values.logo).toEqual('logo');
      expect(SettingsLogic.values.stagedLogo).toEqual(null);
    });

    it('setStagedLogo', () => {
      SettingsLogic.actions.setStagedLogo('stagedLogo');

      expect(SettingsLogic.values.stagedLogo).toEqual('stagedLogo');
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

        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/org/settings');
        await nextTick();
        expect(setServerPropsSpy).toHaveBeenCalledWith(configuredSources);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        SettingsLogic.actions.initializeSettings();
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

        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/org/settings/connectors');
        await nextTick();
        expect(onInitializeConnectorsSpy).toHaveBeenCalledWith(serverProps);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        SettingsLogic.actions.initializeConnectors();
      });
    });

    describe('updateOrgName', () => {
      it('calls API and sets values', async () => {
        const NAME = 'updated name';
        SettingsLogic.actions.onOrgNameInputChange(NAME);
        const setUpdatedNameSpy = jest.spyOn(SettingsLogic.actions, 'setUpdatedName');
        http.put.mockReturnValue(Promise.resolve({ organizationName: NAME }));

        SettingsLogic.actions.updateOrgName();

        expect(http.put).toHaveBeenCalledWith('/internal/workplace_search/org/settings/customize', {
          body: JSON.stringify({ name: NAME }),
        });
        await nextTick();
        expect(flashSuccessToast).toHaveBeenCalledWith(ORG_UPDATED_MESSAGE);
        expect(setUpdatedNameSpy).toHaveBeenCalledWith({ organizationName: NAME });
      });

      itShowsServerErrorAsFlashMessage(http.put, () => {
        SettingsLogic.actions.updateOrgName();
      });
    });

    describe('updateOrgIcon', () => {
      it('calls API and sets values', async () => {
        const ICON = 'icon';
        SettingsLogic.actions.setStagedIcon(ICON);
        const setIconSpy = jest.spyOn(SettingsLogic.actions, 'setIcon');
        http.put.mockReturnValue(Promise.resolve({ icon: ICON }));

        SettingsLogic.actions.updateOrgIcon();

        expect(http.put).toHaveBeenCalledWith(
          '/internal/workplace_search/org/settings/upload_images',
          {
            body: JSON.stringify({ icon: ICON }),
          }
        );
        await nextTick();
        expect(flashSuccessToast).toHaveBeenCalledWith(ORG_UPDATED_MESSAGE);
        expect(setIconSpy).toHaveBeenCalledWith(ICON);
      });

      itShowsServerErrorAsFlashMessage(http.put, () => {
        SettingsLogic.actions.updateOrgIcon();
      });
    });

    describe('updateOrgLogo', () => {
      it('calls API and sets values', async () => {
        const LOGO = 'logo';
        SettingsLogic.actions.setStagedLogo(LOGO);
        const setLogoSpy = jest.spyOn(SettingsLogic.actions, 'setLogo');
        http.put.mockReturnValue(Promise.resolve({ logo: LOGO }));

        SettingsLogic.actions.updateOrgLogo();

        expect(http.put).toHaveBeenCalledWith(
          '/internal/workplace_search/org/settings/upload_images',
          {
            body: JSON.stringify({ logo: LOGO }),
          }
        );
        await nextTick();
        expect(flashSuccessToast).toHaveBeenCalledWith(ORG_UPDATED_MESSAGE);
        expect(setLogoSpy).toHaveBeenCalledWith(LOGO);
      });

      itShowsServerErrorAsFlashMessage(http.put, () => {
        SettingsLogic.actions.updateOrgLogo();
      });
    });

    it('resetOrgLogo', () => {
      const updateOrgLogoSpy = jest.spyOn(SettingsLogic.actions, 'updateOrgLogo');
      SettingsLogic.actions.setStagedLogo('stagedLogo');
      SettingsLogic.actions.setLogo('logo');
      SettingsLogic.actions.resetOrgLogo();

      expect(SettingsLogic.values.logo).toEqual(null);
      expect(SettingsLogic.values.stagedLogo).toEqual(null);
      expect(updateOrgLogoSpy).toHaveBeenCalled();
    });

    it('resetOrgIcon', () => {
      const updateOrgIconSpy = jest.spyOn(SettingsLogic.actions, 'updateOrgIcon');
      SettingsLogic.actions.setStagedIcon('stagedIcon');
      SettingsLogic.actions.setIcon('icon');
      SettingsLogic.actions.resetOrgIcon();

      expect(SettingsLogic.values.icon).toEqual(null);
      expect(SettingsLogic.values.stagedIcon).toEqual(null);
      expect(updateOrgIconSpy).toHaveBeenCalled();
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
          '/internal/workplace_search/org/settings/oauth_application',
          {
            body: JSON.stringify({
              oauth_application: { name, confidential, redirect_uri: redirectUri },
            }),
          }
        );
        await nextTick();
        expect(setUpdatedOauthApplicationSpy).toHaveBeenCalledWith({ oauthApplication });
        expect(flashSuccessToast).toHaveBeenCalledWith(OAUTH_APP_UPDATED_MESSAGE);
      });

      itShowsServerErrorAsFlashMessage(http.put, () => {
        SettingsLogic.actions.updateOauthApplication();
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
        expect(flashSuccessToast).toHaveBeenCalled();
      });

      itShowsServerErrorAsFlashMessage(http.delete, () => {
        SettingsLogic.actions.deleteSourceConfig(SERVICE_TYPE, NAME);
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
