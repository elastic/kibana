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

import {
  ADD_GITHUB_PATH,
  SOURCES_PATH,
  PRIVATE_SOURCES_PATH,
  getSourcesPath,
} from '../../../../routes';
import { CustomSource } from '../../../../types';
import { PERSONAL_DASHBOARD_SOURCE_ERROR } from '../../constants';
import { SourcesLogic } from '../../sources_logic';

import {
  AddSourceLogic,
  AddSourceSteps,
  SourceConfigData,
  SourceConnectData,
  OrganizationsMap,
} from './add_source_logic';

describe('AddSourceLogic', () => {
  const { mount } = new LogicMounter(AddSourceLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { clearFlashMessages, flashAPIErrors, setErrorMessage } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    addSourceCurrentStep: AddSourceSteps.ConfigIntroStep,
    addSourceProps: {},
    dataLoading: true,
    sectionLoading: true,
    buttonLoading: false,
    customSourceNameValue: '',
    clientIdValue: '',
    clientSecretValue: '',
    baseUrlValue: '',
    loginValue: '',
    passwordValue: '',
    subdomainValue: '',
    indexPermissionsValue: false,
    sourceConfigData: {} as SourceConfigData,
    sourceConnectData: {} as SourceConnectData,
    newCustomSource: {} as CustomSource,
    oauthConfigCompleted: false,
    currentServiceType: '',
    githubOrganizations: [],
    selectedGithubOrganizationsMap: {} as OrganizationsMap,
    selectedGithubOrganizations: [],
    preContentSourceId: '',
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

  const CUSTOM_SERVICE_TYPE_INDEX = 17;

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
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
        clientIdValue: sourceConfigData.configuredFields.clientId,
        baseUrlValue: sourceConfigData.configuredFields.baseUrl,
        clientSecretValue: sourceConfigData.configuredFields.clientSecret,
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

    it('setClientIdValue', () => {
      AddSourceLogic.actions.setClientIdValue('id');

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        clientIdValue: 'id',
      });
    });

    it('setClientSecretValue', () => {
      AddSourceLogic.actions.setClientSecretValue('secret');

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        clientSecretValue: 'secret',
      });
    });

    it('setBaseUrlValue', () => {
      AddSourceLogic.actions.setBaseUrlValue('secret');

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        baseUrlValue: 'secret',
      });
    });

    it('setCustomSourceNameValue', () => {
      AddSourceLogic.actions.setCustomSourceNameValue('name');

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        customSourceNameValue: 'name',
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

    it('setCustomSourceData', () => {
      const newCustomSource = {
        accessToken: 'foo',
        key: 'bar',
        name: 'source',
        id: '123key',
      };

      AddSourceLogic.actions.setCustomSourceData(newCustomSource);

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        newCustomSource,
      });
    });

    it('setPreContentSourceConfigData', () => {
      AddSourceLogic.actions.setPreContentSourceConfigData(config);

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        oauthConfigCompleted: true,
        dataLoading: false,
        sectionLoading: false,
        currentServiceType: config.serviceType,
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

    it('handles fallback states', () => {
      const { publicKey, privateKey, consumerKey } = sourceConfigData.configuredFields;
      const sourceConfigDataMock = {
        ...sourceConfigData,
        configuredFields: {
          publicKey,
          privateKey,
          consumerKey,
        },
      };
      AddSourceLogic.actions.setSourceConfigData(sourceConfigDataMock);

      expect(AddSourceLogic.values).toEqual({
        ...DEFAULT_VALUES,
        dataLoading: false,
        sourceConfigData: sourceConfigDataMock,
        clientIdValue: '',
        clientSecretValue: '',
        baseUrlValue: '',
      });
    });
  });

  describe('listeners', () => {
    it('initializeAddSource', () => {
      const addSourceProps = { sourceIndex: 1 };
      const getSourceConfigDataSpy = jest.spyOn(AddSourceLogic.actions, 'getSourceConfigData');
      const setAddSourcePropsSpy = jest.spyOn(AddSourceLogic.actions, 'setAddSourceProps');
      const setAddSourceStepSpy = jest.spyOn(AddSourceLogic.actions, 'setAddSourceStep');

      AddSourceLogic.actions.initializeAddSource(addSourceProps);

      expect(setAddSourcePropsSpy).toHaveBeenCalledWith({ addSourceProps });
      expect(setAddSourceStepSpy).toHaveBeenCalledWith(AddSourceSteps.ConfigIntroStep);
      expect(getSourceConfigDataSpy).toHaveBeenCalledWith('confluence_cloud');
    });

    describe('getFirstStep', () => {
      it('sets custom as first step', () => {
        const setAddSourceStepSpy = jest.spyOn(AddSourceLogic.actions, 'setAddSourceStep');
        const addSourceProps = { sourceIndex: CUSTOM_SERVICE_TYPE_INDEX };
        AddSourceLogic.actions.initializeAddSource(addSourceProps);

        expect(setAddSourceStepSpy).toHaveBeenCalledWith(AddSourceSteps.ConfigureCustomStep);
      });

      it('sets connect as first step', () => {
        const setAddSourceStepSpy = jest.spyOn(AddSourceLogic.actions, 'setAddSourceStep');
        const addSourceProps = { sourceIndex: 1, connect: true };
        AddSourceLogic.actions.initializeAddSource(addSourceProps);

        expect(setAddSourceStepSpy).toHaveBeenCalledWith(AddSourceSteps.ConnectInstanceStep);
      });

      it('sets configure as first step', () => {
        const setAddSourceStepSpy = jest.spyOn(AddSourceLogic.actions, 'setAddSourceStep');
        const addSourceProps = { sourceIndex: 1, configure: true };
        AddSourceLogic.actions.initializeAddSource(addSourceProps);

        expect(setAddSourceStepSpy).toHaveBeenCalledWith(AddSourceSteps.ConfigureOauthStep);
      });

      it('sets reAuthenticate as first step', () => {
        const setAddSourceStepSpy = jest.spyOn(AddSourceLogic.actions, 'setAddSourceStep');
        const addSourceProps = { sourceIndex: 1, reAuthenticate: true };
        AddSourceLogic.actions.initializeAddSource(addSourceProps);

        expect(setAddSourceStepSpy).toHaveBeenCalledWith(AddSourceSteps.ReauthenticateStep);
      });
    });

    describe('saveSourceParams', () => {
      const params = {
        code: 'code123',
        session_state: 'session_state123',
        state:
          '{"action":"create","context":"organization","service_type":"gmail","csrf_token":"token==","index_permissions":false}',
      };

      const queryString =
        '?state=%7B%22action%22:%22create%22,%22context%22:%22organization%22,%22service_type%22:%22gmail%22,%22csrf_token%22:%22token%3D%3D%22,%22index_permissions%22:false%7D&code=code123';

      const response = { serviceName: 'name', indexPermissions: false, serviceType: 'zendesk' };

      beforeEach(() => {
        SourcesLogic.mount();
      });

      it('sends params to server and calls correct methods', async () => {
        const setAddedSourceSpy = jest.spyOn(SourcesLogic.actions, 'setAddedSource');
        const { serviceName, indexPermissions, serviceType } = response;
        http.get.mockReturnValue(Promise.resolve(response));
        AddSourceLogic.actions.saveSourceParams(queryString, params, true);
        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/sources/create', {
          query: {
            ...params,
            kibana_host: '',
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
            kibana_host: '',
          },
        });

        await nextTick();

        expect(setPreContentSourceIdSpy).toHaveBeenCalledWith(preContentSourceId);
        expect(navigateToUrl).toHaveBeenCalledWith(`${ADD_GITHUB_PATH}/configure${queryString}`);
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

          AddSourceLogic.actions.getSourceConfigData('github');
          expect(http.get).toHaveBeenCalledWith(
            '/internal/workplace_search/org/settings/connectors/github'
          );
          await nextTick();
          expect(setSourceConfigDataSpy).toHaveBeenCalledWith(sourceConfigData);
        });

        itShowsServerErrorAsFlashMessage(http.get, () => {
          AddSourceLogic.actions.getSourceConfigData('github');
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

          AddSourceLogic.actions.getSourceConnectData('github', successCallback);

          const query = {
            index_permissions: false,
            kibana_host: '',
          };

          expect(clearFlashMessages).toHaveBeenCalled();
          expect(AddSourceLogic.values.buttonLoading).toEqual(true);
          expect(http.get).toHaveBeenCalledWith(
            '/internal/workplace_search/org/sources/github/prepare',
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
          AddSourceLogic.actions.getSourceConnectData('github', successCallback);

          const query = {
            index_permissions: true,
            kibana_host: '',
            subdomain: 'subdomain',
          };

          expect(http.get).toHaveBeenCalledWith(
            '/internal/workplace_search/org/sources/github/prepare',
            {
              query,
            }
          );
        });

        itShowsServerErrorAsFlashMessage(http.get, () => {
          AddSourceLogic.actions.getSourceConnectData('github', successCallback);
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
            '/internal/workplace_search/org/sources/github/reauth_prepare',
            {
              query: {
                kibana_host: '',
              },
            }
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
        let params: any;

        beforeEach(() => {
          AddSourceLogic.actions.setSourceConfigData(sourceConfigData);

          params = {
            base_url: AddSourceLogic.values.baseUrlValue,
            client_id: AddSourceLogic.values.clientIdValue,
            client_secret: AddSourceLogic.values.clientSecretValue,
            service_type: sourceConfigData.serviceType,
            private_key: sourceConfigData.configuredFields?.privateKey,
            public_key: sourceConfigData.configuredFields?.publicKey,
            consumer_key: sourceConfigData.configuredFields?.consumerKey,
          };
        });

        it('calls API and sets values when updating', async () => {
          const successCallback = jest.fn();
          const setButtonNotLoadingSpy = jest.spyOn(AddSourceLogic.actions, 'setButtonNotLoading');
          const setSourceConfigDataSpy = jest.spyOn(AddSourceLogic.actions, 'setSourceConfigData');
          http.put.mockReturnValue(Promise.resolve({ sourceConfigData }));

          AddSourceLogic.actions.saveSourceConfig(true, successCallback);

          expect(clearFlashMessages).toHaveBeenCalled();
          expect(AddSourceLogic.values.buttonLoading).toEqual(true);
          expect(http.put).toHaveBeenCalledWith(
            `/internal/workplace_search/org/settings/connectors/${sourceConfigData.serviceType}`,
            { body: JSON.stringify(params) }
          );

          await nextTick();
          expect(successCallback).toHaveBeenCalled();
          expect(setSourceConfigDataSpy).toHaveBeenCalledWith({ sourceConfigData });
          expect(setButtonNotLoadingSpy).toHaveBeenCalled();
        });

        it('calls API when creating with empty attributes', () => {
          AddSourceLogic.actions.setClientIdValue('');
          AddSourceLogic.actions.setClientSecretValue('');
          AddSourceLogic.actions.setBaseUrlValue('');
          AddSourceLogic.actions.saveSourceConfig(false);

          const createParams = {
            service_type: sourceConfigData.serviceType,
            private_key: sourceConfigData.configuredFields?.privateKey,
            public_key: sourceConfigData.configuredFields?.publicKey,
            consumer_key: sourceConfigData.configuredFields?.consumerKey,
          };

          expect(http.post).toHaveBeenCalledWith(
            '/internal/workplace_search/org/settings/connectors',
            {
              body: JSON.stringify(createParams),
            }
          );
        });

        itShowsServerErrorAsFlashMessage(http.put, () => {
          AddSourceLogic.actions.saveSourceConfig(true);
        });
      });

      describe('createContentSource', () => {
        const successCallback = jest.fn();
        const errorCallback = jest.fn();

        const serviceType = 'zendesk';
        const name = 'name';
        const login = 'login';
        const password = 'password';
        const indexPermissions = false;

        let params: any;

        beforeEach(() => {
          AddSourceLogic.actions.setCustomSourceNameValue(name);
          AddSourceLogic.actions.setSourceLoginValue(login);
          AddSourceLogic.actions.setSourcePasswordValue(password);
          AddSourceLogic.actions.setPreContentSourceConfigData(config);
          AddSourceLogic.actions.setSourceIndexPermissionsValue(indexPermissions);
          AddSourceLogic.actions.setSelectedGithubOrganizations('foo');

          params = {
            service_type: serviceType,
            name,
            login,
            password,
            organizations: ['foo'],
          };
        });

        it('calls API and sets values', async () => {
          const setButtonNotLoadingSpy = jest.spyOn(AddSourceLogic.actions, 'setButtonNotLoading');
          const setCustomSourceDataSpy = jest.spyOn(AddSourceLogic.actions, 'setCustomSourceData');
          http.post.mockReturnValue(Promise.resolve({ sourceConfigData }));

          AddSourceLogic.actions.createContentSource(serviceType, successCallback, errorCallback);

          expect(clearFlashMessages).toHaveBeenCalled();
          expect(AddSourceLogic.values.buttonLoading).toEqual(true);
          expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/org/create_source', {
            body: JSON.stringify({ ...params }),
          });
          await nextTick();
          expect(setCustomSourceDataSpy).toHaveBeenCalledWith({ sourceConfigData });
          expect(successCallback).toHaveBeenCalled();
          expect(setButtonNotLoadingSpy).toHaveBeenCalled();
        });

        it('handles error', async () => {
          http.post.mockReturnValue(Promise.reject('this is an error'));

          AddSourceLogic.actions.createContentSource(serviceType, successCallback, errorCallback);
          await nextTick();

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
        const query = {
          kibana_host: '',
        };

        AddSourceLogic.actions.getSourceConnectData('github', jest.fn());

        expect(http.get).toHaveBeenCalledWith(
          '/internal/workplace_search/account/sources/github/prepare',
          {
            query,
          }
        );
      });

      it('getSourceReConnectData', () => {
        AddSourceLogic.actions.getSourceReConnectData('123');

        expect(http.get).toHaveBeenCalledWith(
          '/internal/workplace_search/account/sources/123/reauth_prepare',
          {
            query: {
              kibana_host: '',
            },
          }
        );
      });

      it('getPreContentSourceConfigData', () => {
        mount({ preContentSourceId: '123' });
        AddSourceLogic.actions.getPreContentSourceConfigData();

        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/account/pre_sources/123');
      });

      it('createContentSource', () => {
        AddSourceLogic.actions.createContentSource('github', jest.fn());

        expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/account/create_source', {
          body: JSON.stringify({ service_type: 'github' }),
        });
      });
    });
  });
});
