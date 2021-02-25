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
} from '../../../../../__mocks__';
import { sourceConfigData } from '../../../../__mocks__/content_sources.mock';

import { nextTick } from '@kbn/test/jest';

jest.mock('../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));
import { AppLogic } from '../../../../app_logic';

import { SOURCES_PATH, getSourcesPath } from '../../../../routes';
import { CustomSource } from '../../../../types';
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
  const { clearFlashMessages, flashAPIErrors } = mockFlashMessageHelpers;

  const defaultValues = {
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
    currentServiceType: '',
    githubOrganizations: [],
    selectedGithubOrganizationsMap: {} as OrganizationsMap,
    selectedGithubOrganizations: [],
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
    expect(AddSourceLogic.values).toEqual(defaultValues);
  });

  describe('actions', () => {
    it('setSourceConfigData', () => {
      AddSourceLogic.actions.setSourceConfigData(sourceConfigData);

      expect(AddSourceLogic.values.sourceConfigData).toEqual(sourceConfigData);
      expect(AddSourceLogic.values.dataLoading).toEqual(false);
      expect(AddSourceLogic.values.buttonLoading).toEqual(false);
      expect(AddSourceLogic.values.clientIdValue).toEqual(
        sourceConfigData.configuredFields.clientId
      );
      expect(AddSourceLogic.values.clientSecretValue).toEqual(
        sourceConfigData.configuredFields.clientSecret
      );
      expect(AddSourceLogic.values.baseUrlValue).toEqual(sourceConfigData.configuredFields.baseUrl);
    });

    it('setSourceConnectData', () => {
      AddSourceLogic.actions.setSourceConnectData(sourceConnectData);

      expect(AddSourceLogic.values.sourceConnectData).toEqual(sourceConnectData);
      expect(AddSourceLogic.values.buttonLoading).toEqual(false);
    });

    it('setClientIdValue', () => {
      AddSourceLogic.actions.setClientIdValue('id');

      expect(AddSourceLogic.values.clientIdValue).toEqual('id');
    });

    it('setClientSecretValue', () => {
      AddSourceLogic.actions.setClientSecretValue('secret');

      expect(AddSourceLogic.values.clientSecretValue).toEqual('secret');
    });

    it('setBaseUrlValue', () => {
      AddSourceLogic.actions.setBaseUrlValue('secret');

      expect(AddSourceLogic.values.baseUrlValue).toEqual('secret');
    });

    it('setCustomSourceNameValue', () => {
      AddSourceLogic.actions.setCustomSourceNameValue('name');

      expect(AddSourceLogic.values.customSourceNameValue).toEqual('name');
    });

    it('setSourceLoginValue', () => {
      AddSourceLogic.actions.setSourceLoginValue('login');

      expect(AddSourceLogic.values.loginValue).toEqual('login');
    });

    it('setSourcePasswordValue', () => {
      AddSourceLogic.actions.setSourcePasswordValue('password');

      expect(AddSourceLogic.values.passwordValue).toEqual('password');
    });

    it('setSourceSubdomainValue', () => {
      AddSourceLogic.actions.setSourceSubdomainValue('subdomain');

      expect(AddSourceLogic.values.subdomainValue).toEqual('subdomain');
    });

    it('setSourceIndexPermissionsValue', () => {
      AddSourceLogic.actions.setSourceIndexPermissionsValue(true);

      expect(AddSourceLogic.values.indexPermissionsValue).toEqual(true);
    });

    it('setCustomSourceData', () => {
      const newCustomSource = {
        accessToken: 'foo',
        key: 'bar',
        name: 'source',
        id: '123key',
      };

      AddSourceLogic.actions.setCustomSourceData(newCustomSource);

      expect(AddSourceLogic.values.newCustomSource).toEqual(newCustomSource);
    });

    it('setPreContentSourceConfigData', () => {
      AddSourceLogic.actions.setPreContentSourceConfigData(config);

      expect(AddSourceLogic.values.dataLoading).toEqual(false);
      expect(AddSourceLogic.values.sectionLoading).toEqual(false);
      expect(AddSourceLogic.values.currentServiceType).toEqual(config.serviceType);
      expect(AddSourceLogic.values.githubOrganizations).toEqual(config.githubOrganizations);
    });

    it('setSelectedGithubOrganizations', () => {
      AddSourceLogic.actions.setSelectedGithubOrganizations('foo');

      expect(AddSourceLogic.values.selectedGithubOrganizationsMap).toEqual({ foo: true });
    });

    it('setButtonNotLoading', () => {
      AddSourceLogic.actions.setButtonNotLoading();

      expect(AddSourceLogic.values.buttonLoading).toEqual(false);
    });

    it('resetSourceState', () => {
      AddSourceLogic.actions.resetSourceState();

      expect(AddSourceLogic.values.dataLoading).toEqual(false);
      expect(AddSourceLogic.values.buttonLoading).toEqual(false);
      expect(AddSourceLogic.values.clientIdValue).toEqual('');
      expect(AddSourceLogic.values.clientSecretValue).toEqual('');
      expect(AddSourceLogic.values.baseUrlValue).toEqual('');
      expect(AddSourceLogic.values.loginValue).toEqual('');
      expect(AddSourceLogic.values.passwordValue).toEqual('');
      expect(AddSourceLogic.values.subdomainValue).toEqual('');
      expect(AddSourceLogic.values.indexPermissionsValue).toEqual(false);
      expect(AddSourceLogic.values.customSourceNameValue).toEqual('');
      expect(AddSourceLogic.values.newCustomSource).toEqual({});
      expect(AddSourceLogic.values.currentServiceType).toEqual('');
      expect(AddSourceLogic.values.githubOrganizations).toEqual([]);
      expect(AddSourceLogic.values.selectedGithubOrganizationsMap).toEqual({});
    });

    it('handles fallback states', () => {
      const { publicKey, privateKey, consumerKey } = sourceConfigData.configuredFields;
      AddSourceLogic.actions.setSourceConfigData({
        ...sourceConfigData,
        configuredFields: {
          publicKey,
          privateKey,
          consumerKey,
        },
      });

      expect(AddSourceLogic.values.clientIdValue).toEqual('');
      expect(AddSourceLogic.values.clientSecretValue).toEqual('');
      expect(AddSourceLogic.values.baseUrlValue).toEqual('');
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

        expect(setAddSourceStepSpy).toHaveBeenCalledWith(AddSourceSteps.ReAuthenticateStep);
      });
    });

    describe('saveSourceParams', () => {
      const params = {
        code: 'code123',
        state: '"{"state": "foo"}"',
        session_state: 'session123',
      };

      const queryString =
        'code=code123&state=%22%7B%22state%22%3A%20%22foo%22%7D%22&session_state=session123';

      const response = { serviceName: 'name', indexPermissions: false, serviceType: 'zendesk' };

      beforeEach(() => {
        SourcesLogic.mount();
      });

      it('sends params to server and calls correct methods', async () => {
        const setAddedSourceSpy = jest.spyOn(SourcesLogic.actions, 'setAddedSource');
        const { serviceName, indexPermissions, serviceType } = response;
        http.get.mockReturnValue(Promise.resolve(response));
        AddSourceLogic.actions.saveSourceParams(queryString);
        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/sources/create', {
          query: {
            ...params,
            kibana_host: '',
          },
        });

        await nextTick();

        expect(setAddedSourceSpy).toHaveBeenCalledWith(serviceName, indexPermissions, serviceType);
        expect(navigateToUrl).toHaveBeenCalledWith(
          getSourcesPath(SOURCES_PATH, AppLogic.values.isOrganization)
        );
      });

      it('handles error', async () => {
        http.get.mockReturnValue(Promise.reject('this is an error'));

        AddSourceLogic.actions.saveSourceParams(queryString);
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
            '/api/workplace_search/org/settings/connectors/github'
          );
          await nextTick();
          expect(setSourceConfigDataSpy).toHaveBeenCalledWith(sourceConfigData);
        });

        it('handles error', async () => {
          http.get.mockReturnValue(Promise.reject('this is an error'));

          AddSourceLogic.actions.getSourceConfigData('github');
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
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
            '/api/workplace_search/org/sources/github/prepare',
            { query }
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
            '/api/workplace_search/org/sources/github/prepare',
            { query }
          );
        });

        it('handles error', async () => {
          http.get.mockReturnValue(Promise.reject('this is an error'));

          AddSourceLogic.actions.getSourceConnectData('github', successCallback);
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
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
            '/api/workplace_search/org/sources/github/reauth_prepare'
          );
          await nextTick();
          expect(setSourceConnectDataSpy).toHaveBeenCalledWith(sourceConnectData);
        });

        it('handles error', async () => {
          http.get.mockReturnValue(Promise.reject('this is an error'));

          AddSourceLogic.actions.getSourceReConnectData('github');
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        });
      });

      describe('getPreContentSourceConfigData', () => {
        it('calls API and sets values', async () => {
          const setPreContentSourceConfigDataSpy = jest.spyOn(
            AddSourceLogic.actions,
            'setPreContentSourceConfigData'
          );
          http.get.mockReturnValue(Promise.resolve(config));

          AddSourceLogic.actions.getPreContentSourceConfigData('123');

          expect(http.get).toHaveBeenCalledWith('/api/workplace_search/org/pre_sources/123');
          await nextTick();
          expect(setPreContentSourceConfigDataSpy).toHaveBeenCalledWith(config);
        });

        it('handles error', async () => {
          http.get.mockReturnValue(Promise.reject('this is an error'));

          AddSourceLogic.actions.getPreContentSourceConfigData('123');
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
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
          expect(
            http.put
          ).toHaveBeenCalledWith(
            `/api/workplace_search/org/settings/connectors/${sourceConfigData.serviceType}`,
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

          expect(http.post).toHaveBeenCalledWith('/api/workplace_search/org/settings/connectors', {
            body: JSON.stringify(createParams),
          });
        });

        it('handles error', async () => {
          http.put.mockReturnValue(Promise.reject('this is an error'));

          AddSourceLogic.actions.saveSourceConfig(true);
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
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
          expect(http.post).toHaveBeenCalledWith('/api/workplace_search/org/create_source', {
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

        expect(
          http.get
        ).toHaveBeenCalledWith('/api/workplace_search/account/sources/github/prepare', { query });
      });

      it('getSourceReConnectData', () => {
        AddSourceLogic.actions.getSourceReConnectData('123');

        expect(http.get).toHaveBeenCalledWith(
          '/api/workplace_search/account/sources/123/reauth_prepare'
        );
      });

      it('getPreContentSourceConfigData', () => {
        AddSourceLogic.actions.getPreContentSourceConfigData('123');

        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/account/pre_sources/123');
      });

      it('createContentSource', () => {
        AddSourceLogic.actions.createContentSource('github', jest.fn());

        expect(http.post).toHaveBeenCalledWith('/api/workplace_search/account/create_source', {
          body: JSON.stringify({ service_type: 'github' }),
        });
      });
    });
  });
});
