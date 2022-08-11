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
} from '../../../../../__mocks__/kea_logic';
import { sourceConfigData } from '../../../../__mocks__/content_sources.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../../../test_helpers';

jest.mock('../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));
import { AppLogic } from '../../../../app_logic';

import { SOURCES_PATH, PRIVATE_SOURCES_PATH, getSourcesPath } from '../../../../routes';
import { PERSONAL_DASHBOARD_SOURCE_ERROR } from '../../constants';
import { staticSourceData } from '../../source_data';
import { SourcesLogic } from '../../sources_logic';

import { ExternalConnectorLogic } from './add_external_connector/external_connector_logic';
import {
  AddSourceLogic,
  AddSourceSteps,
  SourceConfigData,
  SourceConnectData,
  OrganizationsMap,
  AddSourceValues,
} from './add_source_logic';

describe('AddSourceLogic', () => {
  const { mount } = new LogicMounter(AddSourceLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { clearFlashMessages, flashAPIErrors, setErrorMessage } = mockFlashMessageHelpers;

  const DEFAULT_VALUES: AddSourceValues = {
    addSourceCurrentStep: null,
    dataLoading: true,
    sectionLoading: true,
    buttonLoading: false,
    loginValue: '',
    passwordValue: '',
    subdomainValue: '',
    indexPermissionsValue: false,
    sourceConfigData: {} as SourceConfigData,
    sourceConnectData: {} as SourceConnectData,
    oauthConfigCompleted: false,
    githubOrganizations: [],
    selectedGithubOrganizationsMap: {} as OrganizationsMap,
    selectedGithubOrganizations: [],
    preContentSourceId: '',
    sourceData: staticSourceData[0],
    configuredFields: {},
  };

  const sourceConnectData = {
    oauthUrl: 'http://foo',
    serviceType: 'gmail',
  };

  const config = {
    id: '123key',
    serviceType: 'github',
    githubOrganizations: ['foo', 'bar'],
  };
  const DEFAULT_SERVICE_TYPE = 'box';

  beforeEach(() => {
    jest.clearAllMocks();
    ExternalConnectorLogic.mount();
    SourcesLogic.mount();
    mount({}, { serviceType: 'box' });
  });

  it('has expected default values', () => {
    expect(AddSourceLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    it('setSourceConfigData', () => {
      AddSourceLogic.actions.setSourceConfigData(sourceConfigData);

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        sourceConfigData,
        dataLoading: false,
        buttonLoading: false,
        configuredFields: sourceConfigData.configuredFields,
      });
    });

    it('setSourceConnectData', () => {
      AddSourceLogic.actions.setSourceConnectData(sourceConnectData);

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        sourceConnectData,
        buttonLoading: false,
      });
    });

    it('setSourceLoginValue', () => {
      AddSourceLogic.actions.setSourceLoginValue('login');

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        loginValue: 'login',
      });
    });

    it('setSourcePasswordValue', () => {
      AddSourceLogic.actions.setSourcePasswordValue('password');

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        passwordValue: 'password',
      });
    });

    it('setSourceSubdomainValue', () => {
      AddSourceLogic.actions.setSourceSubdomainValue('subdomain');

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        subdomainValue: 'subdomain',
      });
    });

    it('setSourceIndexPermissionsValue', () => {
      AddSourceLogic.actions.setSourceIndexPermissionsValue(true);

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        indexPermissionsValue: true,
      });
    });

    it('setPreContentSourceConfigData', () => {
      AddSourceLogic.actions.setPreContentSourceConfigData(config);

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        oauthConfigCompleted: true,
        dataLoading: false,
        sectionLoading: false,
        githubOrganizations: config.githubOrganizations,
      });
    });

    it('setSelectedGithubOrganizations', () => {
      AddSourceLogic.actions.setSelectedGithubOrganizations('foo');

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        selectedGithubOrganizationsMap: {
          foo: true,
        },
        selectedGithubOrganizations: ['foo'],
      });
    });

    it('setPreContentSourceId', () => {
      AddSourceLogic.actions.setPreContentSourceId('123');

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        oauthConfigCompleted: false,
        preContentSourceId: '123',
      });
    });

    it('setButtonNotLoading', () => {
      AddSourceLogic.actions.setButtonNotLoading();

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        buttonLoading: false,
      });
    });

    it('resetSourceState', () => {
      AddSourceLogic.actions.resetSourceState();

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        dataLoading: false,
      });
    });
  });

  describe('listeners', () => {
    describe('setFirstStep', () => {
      it('sets save config as first step if unconfigured', () => {
        mount(
          {
            sourceConfigData: {
              ...sourceConfigData,
              configured: false,
            },
          },
          { serviceType: DEFAULT_SERVICE_TYPE }
        );
        const setAddSourceStepSpy = jest.spyOn(AddSourceLogic.actions, 'setAddSourceStep');

        AddSourceLogic.actions.setFirstStep();

        expect(setAddSourceStepSpy).toHaveBeenCalledWith(AddSourceSteps.SaveConfigStep);
      });

      it('sets connect step if configured', () => {
        mount(
          {
            sourceConfigData: {
              ...sourceConfigData,
              configured: true,
            },
          },
          { serviceType: DEFAULT_SERVICE_TYPE }
        );
        const setAddSourceStepSpy = jest.spyOn(AddSourceLogic.actions, 'setAddSourceStep');
        AddSourceLogic.actions.setFirstStep();

        expect(setAddSourceStepSpy).toHaveBeenCalledWith(AddSourceSteps.ConnectInstanceStep);
      });

      it('sets connect as first step', () => {
        mount({ sourceConfigData }, { serviceType: DEFAULT_SERVICE_TYPE, initialStep: 'connect' });
        const setAddSourceStepSpy = jest.spyOn(AddSourceLogic.actions, 'setAddSourceStep');

        AddSourceLogic.actions.setFirstStep();

        expect(setAddSourceStepSpy).toHaveBeenCalledWith(AddSourceSteps.ConnectInstanceStep);
      });

      it('sets configure as first step', () => {
        mount(
          { sourceConfigData },
          { serviceType: DEFAULT_SERVICE_TYPE, initialStep: 'configure' }
        );
        const setAddSourceStepSpy = jest.spyOn(AddSourceLogic.actions, 'setAddSourceStep');

        AddSourceLogic.actions.setFirstStep();

        expect(setAddSourceStepSpy).toHaveBeenCalledWith(AddSourceSteps.ConfigureOauthStep);
      });

      it('sets reauthenticate as first step', () => {
        mount(
          { sourceConfigData },
          { serviceType: DEFAULT_SERVICE_TYPE, initialStep: 'reauthenticate' }
        );
        const setAddSourceStepSpy = jest.spyOn(AddSourceLogic.actions, 'setAddSourceStep');

        AddSourceLogic.actions.setFirstStep();

        expect(setAddSourceStepSpy).toHaveBeenCalledWith(AddSourceSteps.ReauthenticateStep);
      });
    });

    describe('saveSourceParams', () => {
      beforeEach(() => {
        SourcesLogic.mount();
      });
      const params = {
        code: 'code123',
        session_state: 'session_state123',
        state:
          '{"action":"create","context":"organization","service_type":"gmail","csrf_token":"token==","index_permissions":false}',
      };

      const queryString =
        '?state=%7B%22action%22:%22create%22,%22context%22:%22organization%22,%22service_type%22:%22gmail%22,%22csrf_token%22:%22token%3D%3D%22,%22index_permissions%22:false%7D&code=code123';

      const response = { serviceName: 'name', indexPermissions: false, serviceType: 'zendesk' };

      it('sends params to server and calls correct methods', async () => {
        const setAddedSourceSpy = jest.spyOn(SourcesLogic.actions, 'setAddedSource');
        const { serviceName, indexPermissions, serviceType } = response;
        http.get.mockReturnValue(Promise.resolve(response));
        AddSourceLogic.actions.saveSourceParams(queryString, params, true);
        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/sources/create', {
          query: {
            ...params,
          },
        });

        await nextTick();

        expect(setAddedSourceSpy).toHaveBeenCalledWith(serviceName, indexPermissions, serviceType);
        expect(navigateToUrl).toHaveBeenCalledWith(getSourcesPath(SOURCES_PATH, true));
      });

      it('redirects to personal dashboard when account context', async () => {
        const accountQueryString =
          '?state=%7B%22action%22:%22create%22,%22context%22:%22account%22,%22service_type%22:%22gmail%22,%22csrf_token%22:%22token%3D%3D%22,%22index_permissions%22:false%7D&code=code';

        AddSourceLogic.actions.saveSourceParams(accountQueryString, params, false);

        await nextTick();

        expect(navigateToUrl).toHaveBeenCalledWith(getSourcesPath(SOURCES_PATH, false));
      });

      it('redirects to oauth config when preContentSourceId is present', async () => {
        const preContentSourceId = 'id123';
        const setPreContentSourceIdSpy = jest.spyOn(
          AddSourceLogic.actions,
          'setPreContentSourceId'
        );

        http.get.mockReturnValue(
          Promise.resolve({
            ...response,
            hasConfigureStep: true,
            preContentSourceId,
          })
        );
        AddSourceLogic.actions.saveSourceParams(queryString, params, true);
        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/sources/create', {
          query: {
            ...params,
          },
        });

        await nextTick();

        expect(setPreContentSourceIdSpy).toHaveBeenCalledWith(preContentSourceId);
        expect(navigateToUrl).toHaveBeenCalledWith(`/sources/add/github/configure${queryString}`);
      });

      describe('Github error edge case', () => {
        const GITHUB_ERROR =
          'The redirect_uri MUST match the registered callback URL for this application.';
        const errorParams = { ...params, error_description: GITHUB_ERROR };
        const getGithubQueryString = (context: 'organization' | 'account') =>
          `?error=redirect_uri_mismatch&error_description=The+redirect_uri+MUST+match+the+registered+callback+URL+for+this+application.&error_uri=https%3A%2F%2Fdocs.github.com%2Fapps%2Fmanaging-oauth-apps%2Ftroubleshooting-authorization-request-errors%2F%23redirect-uri-mismatch&state=%7B%22action%22%3A%22create%22%2C%22context%22%3A%22${context}%22%2C%22service_type%22%3A%22github%22%2C%22csrf_token%22%3A%22TOKEN%3D%3D%22%2C%22index_permissions%22%3Afalse%7D`;

        it('handles "organization" redirect and displays error', () => {
          const githubQueryString = getGithubQueryString('organization');
          AddSourceLogic.actions.saveSourceParams(githubQueryString, errorParams, true);

          expect(navigateToUrl).toHaveBeenCalledWith('/');
          expect(setErrorMessage).toHaveBeenCalledWith(GITHUB_ERROR);
        });

        it('handles "account" redirect and displays error', () => {
          const githubQueryString = getGithubQueryString('account');
          AddSourceLogic.actions.saveSourceParams(githubQueryString, errorParams, false);

          expect(navigateToUrl).toHaveBeenCalledWith(PRIVATE_SOURCES_PATH);
          expect(setErrorMessage).toHaveBeenCalledWith(
            PERSONAL_DASHBOARD_SOURCE_ERROR(GITHUB_ERROR)
          );
        });
      });

      it('handles error', async () => {
        http.get.mockReturnValue(Promise.reject('this is an error'));

        AddSourceLogic.actions.saveSourceParams(queryString, params, true);
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        expect(navigateToUrl).toHaveBeenCalledWith(
          getSourcesPath(SOURCES_PATH, AppLogic.values.isOrganization)
        );
      });
    });

    describe('organization context', () => {
      describe('getSourceConfigData', () => {
        it('calls API and sets values', async () => {
          const setSourceConfigDataSpy = jest.spyOn(AddSourceLogic.actions, 'setSourceConfigData');
          http.get.mockReturnValue(Promise.resolve(sourceConfigData));

          AddSourceLogic.actions.getSourceConfigData();
          await nextTick();

          expect(http.get).toHaveBeenCalledWith(
            '/internal/workplace_search/org/settings/connectors/box'
          );
          expect(setSourceConfigDataSpy).toHaveBeenCalledWith(sourceConfigData);
        });

        it('calls API and sets values and calls setFirstStep if AddSourceProps is provided', async () => {
          const setSourceConfigDataSpy = jest.spyOn(AddSourceLogic.actions, 'setSourceConfigData');
          const setFirstStepSpy = jest.spyOn(AddSourceLogic.actions, 'setFirstStep');

          http.get.mockReturnValue(Promise.resolve(sourceConfigData));

          AddSourceLogic.actions.getSourceConfigData();
          await nextTick();

          expect(http.get).toHaveBeenCalledWith(
            '/internal/workplace_search/org/settings/connectors/box'
          );
          expect(setSourceConfigDataSpy).toHaveBeenCalledWith(sourceConfigData);
          expect(setFirstStepSpy).toHaveBeenCalled();
        });

        itShowsServerErrorAsFlashMessage(http.get, () => {
          AddSourceLogic.actions.getSourceConfigData();
        });
      });

      describe('getSourceConnectData', () => {
        const successCallback = jest.fn();

        it('calls API and sets values', async () => {
          const setButtonNotLoadingSpy = jest.spyOn(AddSourceLogic.actions, 'setButtonNotLoading');
          const setSourceConnectDataSpy = jest.spyOn(
            AddSourceLogic.actions,
            'setSourceConnectData'
          );
          http.get.mockReturnValue(Promise.resolve(sourceConnectData));

          AddSourceLogic.actions.getSourceConnectData(successCallback);

          const query = {
            index_permissions: false,
          };

          expect(clearFlashMessages).toHaveBeenCalled();
          expect(AddSourceLogic.values.buttonLoading).toEqual(true);
          expect(http.get).toHaveBeenCalledWith(
            '/internal/workplace_search/org/sources/box/prepare',
            {
              query,
            }
          );
          await nextTick();
          expect(setSourceConnectDataSpy).toHaveBeenCalledWith(sourceConnectData);
          expect(successCallback).toHaveBeenCalledWith(sourceConnectData.oauthUrl);
          expect(setButtonNotLoadingSpy).toHaveBeenCalled();
        });

        it('passes query params', () => {
          AddSourceLogic.actions.setSourceSubdomainValue('subdomain');
          AddSourceLogic.actions.setSourceIndexPermissionsValue(true);
          AddSourceLogic.actions.getSourceConnectData(successCallback);

          const query = {
            index_permissions: true,
            subdomain: 'subdomain',
          };

          expect(http.get).toHaveBeenCalledWith(
            '/internal/workplace_search/org/sources/box/prepare',
            {
              query,
            }
          );
        });

        itShowsServerErrorAsFlashMessage(http.get, () => {
          AddSourceLogic.actions.getSourceConnectData(successCallback);
        });
      });

      describe('getSourceReConnectData', () => {
        it('calls API and sets values', async () => {
          const setSourceConnectDataSpy = jest.spyOn(
            AddSourceLogic.actions,
            'setSourceConnectData'
          );
          http.get.mockReturnValue(Promise.resolve(sourceConnectData));

          AddSourceLogic.actions.getSourceReConnectData('github');

          expect(http.get).toHaveBeenCalledWith(
            '/internal/workplace_search/org/sources/github/reauth_prepare'
          );
          await nextTick();
          expect(setSourceConnectDataSpy).toHaveBeenCalledWith(sourceConnectData);
        });

        itShowsServerErrorAsFlashMessage(http.get, () => {
          AddSourceLogic.actions.getSourceReConnectData('github');
        });
      });

      describe('getPreContentSourceConfigData', () => {
        it('calls API and sets values', async () => {
          mount({ preContentSourceId: '123' });
          const setPreContentSourceConfigDataSpy = jest.spyOn(
            AddSourceLogic.actions,
            'setPreContentSourceConfigData'
          );
          http.get.mockReturnValue(Promise.resolve(config));

          AddSourceLogic.actions.getPreContentSourceConfigData();

          expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/org/pre_sources/123');
          await nextTick();
          expect(setPreContentSourceConfigDataSpy).toHaveBeenCalledWith(config);
        });

        itShowsServerErrorAsFlashMessage(http.get, () => {
          AddSourceLogic.actions.getPreContentSourceConfigData();
        });
      });

      describe('saveSourceConfig', () => {
        beforeEach(() => {
          AddSourceLogic.actions.setSourceConfigData(sourceConfigData);
        });

        it('calls API and sets values when updating', async () => {
          const successCallback = jest.fn();
          const setButtonNotLoadingSpy = jest.spyOn(AddSourceLogic.actions, 'setButtonNotLoading');
          const setSourceConfigDataSpy = jest.spyOn(AddSourceLogic.actions, 'setSourceConfigData');
          http.put.mockReturnValue(Promise.resolve(sourceConfigData));

          AddSourceLogic.actions.saveSourceConfig(true, successCallback);

          expect(clearFlashMessages).toHaveBeenCalled();
          expect(AddSourceLogic.values.buttonLoading).toEqual(true);
          expect(http.put).toHaveBeenCalledWith(
            `/internal/workplace_search/org/settings/connectors/${sourceConfigData.serviceType}`,
            {
              body: JSON.stringify({
                ...sourceConfigData.configuredFields,
                service_type: sourceConfigData.serviceType,
                external_connector_url: undefined,
                external_connector_api_key: undefined,
              }),
            }
          );

          await nextTick();
          expect(successCallback).toHaveBeenCalled();
          expect(setSourceConfigDataSpy).toHaveBeenCalledWith(sourceConfigData);
          expect(setButtonNotLoadingSpy).toHaveBeenCalled();
        });

        it('calls API and sets values when updating external source', async () => {
          mount({}, { serviceType: 'external' });
          ExternalConnectorLogic.mount();
          ExternalConnectorLogic.actions.setExternalConnectorApiKey('asdf1234');
          ExternalConnectorLogic.actions.setExternalConnectorUrl('https://www.elastic.co');

          AddSourceLogic.actions.setSourceConfigData({
            ...sourceConfigData,
            serviceType: 'external',
          });
          const successCallback = jest.fn();
          const setButtonNotLoadingSpy = jest.spyOn(AddSourceLogic.actions, 'setButtonNotLoading');
          const setSourceConfigDataSpy = jest.spyOn(AddSourceLogic.actions, 'setSourceConfigData');
          http.put.mockReturnValue(
            Promise.resolve({ ...sourceConfigData, serviceType: 'external' })
          );

          AddSourceLogic.actions.saveSourceConfig(true, successCallback);

          expect(clearFlashMessages).toHaveBeenCalled();
          expect(AddSourceLogic.values.buttonLoading).toEqual(true);
          expect(http.put).toHaveBeenCalledWith(
            '/internal/workplace_search/org/settings/connectors/external',
            {
              body: JSON.stringify({
                ...sourceConfigData.configuredFields,
                service_type: 'external',
              }),
            }
          );

          await nextTick();
          expect(successCallback).toHaveBeenCalled();
          expect(setSourceConfigDataSpy).toHaveBeenCalledWith({
            ...sourceConfigData,
            serviceType: 'external',
          });
          expect(setButtonNotLoadingSpy).toHaveBeenCalled();
        });

        it('does not call API when updating external source with invalid URL', async () => {
          mount({}, { serviceType: 'external' });
          ExternalConnectorLogic.mount();
          ExternalConnectorLogic.actions.setExternalConnectorApiKey('asdf1234');
          ExternalConnectorLogic.actions.setExternalConnectorUrl('noUrl');
          AddSourceLogic.actions.setSourceConfigData({
            ...sourceConfigData,
            serviceType: 'external',
          });
          const successCallback = jest.fn();
          const setButtonNotLoadingSpy = jest.spyOn(AddSourceLogic.actions, 'setButtonNotLoading');
          const setSourceConfigDataSpy = jest.spyOn(AddSourceLogic.actions, 'setSourceConfigData');
          http.put.mockReturnValue(
            Promise.resolve({ ...sourceConfigData, serviceType: 'external' })
          );

          AddSourceLogic.actions.saveSourceConfig(true, successCallback);

          expect(clearFlashMessages).toHaveBeenCalled();
          expect(AddSourceLogic.values.buttonLoading).toEqual(false);
          expect(http.put).not.toHaveBeenCalled();

          await nextTick();
          expect(successCallback).not.toHaveBeenCalled();
          expect(setSourceConfigDataSpy).not.toHaveBeenCalled();
          expect(setButtonNotLoadingSpy).toHaveBeenCalled();
        });

        it('calls API when creating with empty attributes', () => {
          AddSourceLogic.actions.setSourceConfigData({
            ...sourceConfigData,
            configuredFields: {},
          });
          AddSourceLogic.actions.saveSourceConfig(false);

          expect(http.post).toHaveBeenCalledWith(
            '/internal/workplace_search/org/settings/connectors',
            {
              body: JSON.stringify({ service_type: 'box' }),
            }
          );
        });

        it('does not call API when external connector URL fails validation', () => {
          mount({}, { serviceType: 'external' });
          ExternalConnectorLogic.mount();
          const setButtonNotLoadingSpy = jest.spyOn(AddSourceLogic.actions, 'setButtonNotLoading');
          const setUrlValidationSpy = jest.spyOn(
            ExternalConnectorLogic.actions,
            'setUrlValidation'
          );
          AddSourceLogic.actions.setSourceConfigData({
            ...sourceConfigData,
            serviceType: 'external',
          });
          ExternalConnectorLogic.actions.setExternalConnectorUrl('invalid_url');
          AddSourceLogic.actions.saveSourceConfig(false);

          expect(http.post).not.toHaveBeenCalled();
          expect(setButtonNotLoadingSpy).toHaveBeenCalled();
          expect(setUrlValidationSpy).toHaveBeenCalledWith(false);
        });

        itShowsServerErrorAsFlashMessage(http.put, () => {
          AddSourceLogic.actions.saveSourceConfig(true);
        });
      });

      describe('createContentSource', () => {
        const successCallback = jest.fn();
        const errorCallback = jest.fn();

        const serviceType = 'box';
        const login = 'login';
        const password = 'password';
        const indexPermissions = false;

        let params: any;

        beforeEach(() => {
          AddSourceLogic.actions.setSourceLoginValue(login);
          AddSourceLogic.actions.setSourcePasswordValue(password);
          AddSourceLogic.actions.setPreContentSourceConfigData(config);
          AddSourceLogic.actions.setSourceIndexPermissionsValue(indexPermissions);
          AddSourceLogic.actions.setSelectedGithubOrganizations('foo');

          params = {
            service_type: serviceType,
            login,
            password,
            organizations: ['foo'],
          };
        });

        it('calls API and sets values', async () => {
          const setButtonNotLoadingSpy = jest.spyOn(AddSourceLogic.actions, 'setButtonNotLoading');
          http.post.mockReturnValue(Promise.resolve());

          AddSourceLogic.actions.createContentSource(successCallback, errorCallback);

          expect(clearFlashMessages).toHaveBeenCalled();
          expect(AddSourceLogic.values.buttonLoading).toEqual(true);
          expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/org/create_source', {
            body: JSON.stringify({ ...params }),
          });
          await nextTick();
          expect(successCallback).toHaveBeenCalled();
          expect(setButtonNotLoadingSpy).toHaveBeenCalled();
        });

        it('handles error', async () => {
          const setButtonNotLoadingSpy = jest.spyOn(AddSourceLogic.actions, 'setButtonNotLoading');
          http.post.mockReturnValue(Promise.reject('this is an error'));

          AddSourceLogic.actions.createContentSource(successCallback, errorCallback);
          await nextTick();

          expect(setButtonNotLoadingSpy).toHaveBeenCalled();
          expect(errorCallback).toHaveBeenCalled();
          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        });
      });
    });

    describe('account context routes', () => {
      beforeEach(() => {
        AppLogic.values.isOrganization = false;
      });

      it('getSourceConnectData', () => {
        AddSourceLogic.actions.getSourceConnectData(jest.fn());

        expect(http.get).toHaveBeenCalledWith(
          '/internal/workplace_search/account/sources/box/prepare',
          { query: {} }
        );
      });

      it('getSourceReConnectData', () => {
        AddSourceLogic.actions.getSourceReConnectData('123');

        expect(http.get).toHaveBeenCalledWith(
          '/internal/workplace_search/account/sources/123/reauth_prepare'
        );
      });

      it('getPreContentSourceConfigData', () => {
        mount({ preContentSourceId: '123' });
        AddSourceLogic.actions.getPreContentSourceConfigData();

        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/account/pre_sources/123');
      });

      it('createContentSource', () => {
        AddSourceLogic.actions.createContentSource(jest.fn());

        expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/account/create_source', {
          body: JSON.stringify({ service_type: 'box' }),
        });
      });
    });
  });
});
