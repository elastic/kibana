/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { keys, pickBy } from 'lodash';

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { HttpLogic } from '../../../../../shared/http';

import {
  flashAPIErrors,
  setSuccessMessage,
  clearFlashMessages,
} from '../../../../../shared/flash_messages';

import { staticSourceData } from '../../source_data';
import { CUSTOM_SERVICE_TYPE } from '../../../../constants';

import { AppLogic } from '../../../../app_logic';
import { CustomSource } from '../../../../types';

export interface AddSourceProps {
  sourceIndex: number;
  connect?: boolean;
  configure?: boolean;
  reAuthenticate?: boolean;
}

export enum AddSourceSteps {
  ConfigIntroStep = 'Config Intro',
  SaveConfigStep = 'Save Config',
  ConfigCompletedStep = 'Config Completed',
  ConnectInstanceStep = 'Connect Instance',
  ConfigureCustomStep = 'Configure Custom',
  ConfigureOauthStep = 'Configure Oauth',
  SaveCustomStep = 'Save Custom',
  ReAuthenticateStep = 'ReAuthenticate',
}

export interface AddSourceActions {
  initializeAddSource: (addSourceProps: AddSourceProps) => { addSourceProps: AddSourceProps };
  setAddSourceProps: ({
    addSourceProps,
  }: {
    addSourceProps: AddSourceProps;
  }) => {
    addSourceProps: AddSourceProps;
  };
  setAddSourceStep(addSourceCurrentStep: AddSourceSteps): AddSourceSteps;
  setSourceConfigData(sourceConfigData: SourceConfigData): SourceConfigData;
  setSourceConnectData(sourceConnectData: SourceConnectData): SourceConnectData;
  setClientIdValue(clientIdValue: string): string;
  setClientSecretValue(clientSecretValue: string): string;
  setBaseUrlValue(baseUrlValue: string): string;
  setCustomSourceNameValue(customSourceNameValue: string): string;
  setSourceLoginValue(loginValue: string): string;
  setSourcePasswordValue(passwordValue: string): string;
  setSourceSubdomainValue(subdomainValue: string): string;
  setSourceIndexPermissionsValue(indexPermissionsValue: boolean): boolean;
  setCustomSourceData(data: CustomSource): CustomSource;
  setPreContentSourceConfigData(data: PreContentSourceResponse): PreContentSourceResponse;
  setSelectedGithubOrganizations(option: string): string;
  resetSourceState(): void;
  createContentSource(
    serviceType: string,
    successCallback: () => void,
    errorCallback?: () => void
  ): { serviceType: string; successCallback(): void; errorCallback?(): void };
  saveSourceConfig(
    isUpdating: boolean,
    successCallback?: () => void
  ): { isUpdating: boolean; successCallback?(): void };
  getSourceConfigData(serviceType: string): { serviceType: string };
  getSourceConnectData(
    serviceType: string,
    successCallback: (oauthUrl: string) => void
  ): { serviceType: string; successCallback(oauthUrl: string): void };
  getSourceReConnectData(sourceId: string): { sourceId: string };
  getPreContentSourceConfigData(preContentSourceId: string): { preContentSourceId: string };
  setButtonNotLoading(): void;
}

export interface SourceConfigData {
  serviceType: string;
  name: string;
  configured: boolean;
  categories: string[];
  needsPermissions?: boolean;
  privateSourcesEnabled: boolean;
  configuredFields: {
    publicKey: string;
    privateKey: string;
    consumerKey: string;
    baseUrl?: string;
    clientId?: string;
    clientSecret?: string;
  };
  accountContextOnly?: boolean;
}

export interface SourceConnectData {
  oauthUrl: string;
  serviceType: string;
}

export interface OrganizationsMap {
  [key: string]: string | boolean;
}

interface AddSourceValues {
  addSourceProps: AddSourceProps;
  addSourceCurrentStep: AddSourceSteps;
  dataLoading: boolean;
  sectionLoading: boolean;
  buttonLoading: boolean;
  customSourceNameValue: string;
  clientIdValue: string;
  clientSecretValue: string;
  baseUrlValue: string;
  loginValue: string;
  passwordValue: string;
  subdomainValue: string;
  indexPermissionsValue: boolean;
  sourceConfigData: SourceConfigData;
  sourceConnectData: SourceConnectData;
  newCustomSource: CustomSource;
  currentServiceType: string;
  githubOrganizations: string[];
  selectedGithubOrganizationsMap: OrganizationsMap;
  selectedGithubOrganizations: string[];
}

interface PreContentSourceResponse {
  id: string;
  serviceType: string;
  githubOrganizations: string[];
}

export const AddSourceLogic = kea<MakeLogicType<AddSourceValues, AddSourceActions>>({
  path: ['enterprise_search', 'workplace_search', 'add_source_logic'],
  actions: {
    initializeAddSource: (addSourceProps: AddSourceProps) => ({ addSourceProps }),
    setAddSourceProps: ({ addSourceProps }: { addSourceProps: AddSourceProps }) => ({
      addSourceProps,
    }),
    setAddSourceStep: (addSourceCurrentStep: AddSourceSteps) => addSourceCurrentStep,
    setSourceConfigData: (sourceConfigData: SourceConfigData) => sourceConfigData,
    setSourceConnectData: (sourceConnectData: SourceConnectData) => sourceConnectData,
    setClientIdValue: (clientIdValue: string) => clientIdValue,
    setClientSecretValue: (clientSecretValue: string) => clientSecretValue,
    setBaseUrlValue: (baseUrlValue: string) => baseUrlValue,
    setCustomSourceNameValue: (customSourceNameValue: string) => customSourceNameValue,
    setSourceLoginValue: (loginValue: string) => loginValue,
    setSourcePasswordValue: (passwordValue: string) => passwordValue,
    setSourceSubdomainValue: (subdomainValue: string) => subdomainValue,
    setSourceIndexPermissionsValue: (indexPermissionsValue: boolean) => indexPermissionsValue,
    setCustomSourceData: (data: CustomSource) => data,
    setPreContentSourceConfigData: (data: PreContentSourceResponse) => data,
    setSelectedGithubOrganizations: (option: string) => option,
    getSourceConfigData: (serviceType: string) => ({ serviceType }),
    getSourceConnectData: (serviceType: string, successCallback: (oauthUrl: string) => string) => ({
      serviceType,
      successCallback,
    }),
    getSourceReConnectData: (sourceId: string) => ({ sourceId }),
    getPreContentSourceConfigData: (preContentSourceId: string) => ({ preContentSourceId }),
    saveSourceConfig: (isUpdating: boolean, successCallback?: () => void) => ({
      isUpdating,
      successCallback,
    }),
    createContentSource: (
      serviceType: string,
      successCallback: () => void,
      errorCallback?: () => void
    ) => ({ serviceType, successCallback, errorCallback }),
    resetSourceState: () => true,
    setButtonNotLoading: () => false,
  },
  reducers: {
    addSourceProps: [
      {} as AddSourceProps,
      {
        setAddSourceProps: (_, { addSourceProps }) => addSourceProps,
      },
    ],
    addSourceCurrentStep: [
      AddSourceSteps.ConfigIntroStep,
      {
        setAddSourceStep: (_, addSourceCurrentStep) => addSourceCurrentStep,
      },
    ],
    sourceConfigData: [
      {} as SourceConfigData,
      {
        setSourceConfigData: (_, sourceConfigData) => sourceConfigData,
      },
    ],
    sourceConnectData: [
      {} as SourceConnectData,
      {
        setSourceConnectData: (_, sourceConnectData) => sourceConnectData,
      },
    ],
    dataLoading: [
      true,
      {
        setSourceConfigData: () => false,
        resetSourceState: () => false,
        setPreContentSourceConfigData: () => false,
      },
    ],
    buttonLoading: [
      false,
      {
        setButtonNotLoading: () => false,
        setSourceConnectData: () => false,
        setSourceConfigData: () => false,
        resetSourceState: () => false,
        saveSourceConfig: () => true,
        getSourceConnectData: () => true,
        createContentSource: () => true,
      },
    ],
    sectionLoading: [
      true,
      {
        getPreContentSourceConfigData: () => true,
        setPreContentSourceConfigData: () => false,
      },
    ],
    clientIdValue: [
      '',
      {
        setClientIdValue: (_, clientIdValue) => clientIdValue,
        setSourceConfigData: (_, { configuredFields: { clientId } }) => clientId || '',
        resetSourceState: () => '',
      },
    ],
    clientSecretValue: [
      '',
      {
        setClientSecretValue: (_, clientSecretValue) => clientSecretValue,
        setSourceConfigData: (_, { configuredFields: { clientSecret } }) => clientSecret || '',
        resetSourceState: () => '',
      },
    ],
    baseUrlValue: [
      '',
      {
        setBaseUrlValue: (_, baseUrlValue) => baseUrlValue,
        setSourceConfigData: (_, { configuredFields: { baseUrl } }) => baseUrl || '',
        resetSourceState: () => '',
      },
    ],
    loginValue: [
      '',
      {
        setSourceLoginValue: (_, loginValue) => loginValue,
        resetSourceState: () => '',
      },
    ],
    passwordValue: [
      '',
      {
        setSourcePasswordValue: (_, passwordValue) => passwordValue,
        resetSourceState: () => '',
      },
    ],
    subdomainValue: [
      '',
      {
        setSourceSubdomainValue: (_, subdomainValue) => subdomainValue,
        resetSourceState: () => '',
      },
    ],
    indexPermissionsValue: [
      false,
      {
        setSourceIndexPermissionsValue: (_, indexPermissionsValue) => indexPermissionsValue,
        resetSourceState: () => false,
      },
    ],
    customSourceNameValue: [
      '',
      {
        setCustomSourceNameValue: (_, customSourceNameValue) => customSourceNameValue,
        resetSourceState: () => '',
      },
    ],
    newCustomSource: [
      {} as CustomSource,
      {
        setCustomSourceData: (_, newCustomSource) => newCustomSource,
        resetSourceState: () => ({} as CustomSource),
      },
    ],
    currentServiceType: [
      '',
      {
        setPreContentSourceConfigData: (_, { serviceType }) => serviceType,
        resetSourceState: () => '',
      },
    ],
    githubOrganizations: [
      [],
      {
        setPreContentSourceConfigData: (_, { githubOrganizations }) => githubOrganizations,
        resetSourceState: () => [],
      },
    ],
    selectedGithubOrganizationsMap: [
      {} as OrganizationsMap,
      {
        setSelectedGithubOrganizations: (state, option) => ({
          ...state,
          ...{ [option]: !state[option] },
        }),
        resetSourceState: () => ({}),
      },
    ],
  },
  selectors: ({ selectors }) => ({
    selectedGithubOrganizations: [
      () => [selectors.selectedGithubOrganizationsMap],
      (orgsMap) => keys(pickBy(orgsMap)),
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeAddSource: ({ addSourceProps }) => {
      const { serviceType } = staticSourceData[addSourceProps.sourceIndex];
      actions.setAddSourceProps({ addSourceProps });
      actions.setAddSourceStep(getFirstStep(addSourceProps));
      actions.getSourceConfigData(serviceType);
    },
    getSourceConfigData: async ({ serviceType }) => {
      const route = `/api/workplace_search/org/settings/connectors/${serviceType}`;

      try {
        const response = await HttpLogic.values.http.get(route);
        actions.setSourceConfigData(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    getSourceConnectData: async ({ serviceType, successCallback }) => {
      clearFlashMessages();
      const { isOrganization } = AppLogic.values;
      const { subdomainValue: subdomain, indexPermissionsValue: indexPermissions } = values;

      const route = isOrganization
        ? `/api/workplace_search/org/sources/${serviceType}/prepare`
        : `/api/workplace_search/account/sources/${serviceType}/prepare`;

      const params = new URLSearchParams();
      if (subdomain) params.append('subdomain', subdomain);
      if (indexPermissions) params.append('index_permissions', indexPermissions.toString());
      const hasParams = params.has('subdomain') || params.has('index_permissions');
      const paramsString = hasParams ? `?${params}` : '';

      try {
        const response = await HttpLogic.values.http.get(`${route}${paramsString}`);
        actions.setSourceConnectData(response);
        successCallback(response.oauthUrl);
      } catch (e) {
        flashAPIErrors(e);
      } finally {
        actions.setButtonNotLoading();
      }
    },
    getSourceReConnectData: async ({ sourceId }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? `/api/workplace_search/org/sources/${sourceId}/reauth_prepare`
        : `/api/workplace_search/account/sources/${sourceId}/reauth_prepare`;

      try {
        const response = await HttpLogic.values.http.get(route);
        actions.setSourceConnectData(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    getPreContentSourceConfigData: async ({ preContentSourceId }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? `/api/workplace_search/org/pre_sources/${preContentSourceId}`
        : `/api/workplace_search/account/pre_sources/${preContentSourceId}`;

      try {
        const response = await HttpLogic.values.http.get(route);
        actions.setPreContentSourceConfigData(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    saveSourceConfig: async ({ isUpdating, successCallback }) => {
      clearFlashMessages();
      const {
        sourceConfigData: { serviceType },
        baseUrlValue,
        clientIdValue,
        clientSecretValue,
        sourceConfigData,
      } = values;

      const route = isUpdating
        ? `/api/workplace_search/org/settings/connectors/${serviceType}`
        : '/api/workplace_search/org/settings/connectors';

      const http = isUpdating ? HttpLogic.values.http.put : HttpLogic.values.http.post;

      const params = {
        base_url: baseUrlValue || undefined,
        client_id: clientIdValue || undefined,
        client_secret: clientSecretValue || undefined,
        service_type: serviceType,
        private_key: sourceConfigData.configuredFields?.privateKey,
        public_key: sourceConfigData.configuredFields?.publicKey,
        consumer_key: sourceConfigData.configuredFields?.consumerKey,
      };

      try {
        const response = await http(route, {
          body: JSON.stringify({ params }),
        });
        if (successCallback) successCallback();
        if (isUpdating) {
          setSuccessMessage(
            i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.sources.flashMessages.contentSourceConfigUpdated',
              {
                defaultMessage: 'Successfully updated configuration.',
              }
            )
          );
        }
        actions.setSourceConfigData(response);
      } catch (e) {
        flashAPIErrors(e);
      } finally {
        actions.setButtonNotLoading();
      }
    },
    createContentSource: async ({ serviceType, successCallback, errorCallback }) => {
      clearFlashMessages();
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? '/api/workplace_search/org/create_source'
        : '/api/workplace_search/account/create_source';

      const {
        selectedGithubOrganizations: githubOrganizations,
        customSourceNameValue,
        loginValue,
        passwordValue,
        indexPermissionsValue,
      } = values;

      const params = {
        service_type: serviceType,
        name: customSourceNameValue || undefined,
        login: loginValue || undefined,
        password: passwordValue || undefined,
        organizations: githubOrganizations.length > 0 ? githubOrganizations : undefined,
        indexPermissions: indexPermissionsValue || undefined,
      } as {
        [key: string]: string | string[] | undefined;
      };

      // Remove undefined values from params
      Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);

      try {
        const response = await HttpLogic.values.http.post(route, {
          body: JSON.stringify({ ...params }),
        });
        actions.setCustomSourceData(response);
        successCallback();
      } catch (e) {
        flashAPIErrors(e);
        if (errorCallback) errorCallback();
      } finally {
        actions.setButtonNotLoading();
      }
    },
  }),
});

const getFirstStep = (props: AddSourceProps): AddSourceSteps => {
  const { sourceIndex, connect, configure, reAuthenticate } = props;
  const { serviceType } = staticSourceData[sourceIndex];
  const isCustom = serviceType === CUSTOM_SERVICE_TYPE;

  if (isCustom) return AddSourceSteps.ConfigureCustomStep;
  if (connect) return AddSourceSteps.ConnectInstanceStep;
  if (configure) return AddSourceSteps.ConfigureOauthStep;
  if (reAuthenticate) return AddSourceSteps.ReAuthenticateStep;
  return AddSourceSteps.ConfigIntroStep;
};
