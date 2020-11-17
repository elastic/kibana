/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { keys, pickBy } from 'lodash';

import { kea, MakeLogicType } from 'kea';

import http from 'shared/http';
import routes from 'workplace_search/routes';

import { handleAPIError } from 'app_search/utils/handleAPIError';
import { IFlashMessagesProps } from 'shared/types';
import { DEFAULT_META } from '../../../shared/constants';
import { AppLogic } from '../../app_logic';
import { NOT_FOUND_PATH } from '../../routes';
import { ContentSourceFullData, CustomSource, Meta } from '../../types';

import { SourcesLogic } from './sources_logic';

export interface SourceActions {
  onInitializeSource(contentSource: ContentSourceFullData): ContentSourceFullData;
  onUpdateSourceName(name: string): string;
  setSourceConfigData(sourceConfigData: SourceConfigData): SourceConfigData;
  setSourceConnectData(sourceConnectData: SourceConnectData): SourceConnectData;
  setFlashMessages(flashMessages: IFlashMessagesProps): { flashMessages: IFlashMessagesProps };
  setSearchResults(searchResultsResponse: SearchResultsResponse): SearchResultsResponse;
  initializeFederatedSummary(sourceId: string): { sourceId: string };
  onUpdateSummary(summary: object[]): object[];
  setContentFilterValue(contentFilterValue: string): string;
  setActivePage(activePage: number): number;
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
  searchContentSourceDocuments(sourceId: string): { sourceId: string };
  updateContentSource(
    sourceId: string,
    source: { name: string }
  ): { sourceId: string; source: { name: string } };
  resetSourceState(): void;
  removeContentSource(
    sourceId: string,
    successCallback: () => void
  ): { sourceId: string; successCallback() };
  createContentSource(
    serviceType: string,
    successCallback: () => void,
    errorCallback?: () => void
  ): { serviceType: string; successCallback(); errorCallback?() };
  saveSourceConfig(
    isUpdating: boolean,
    successCallback?: () => void
  ): { isUpdating: boolean; successCallback?() };
  initializeSource(sourceId: string, history: object): { sourceId: string; history: object };
  getSourceConfigData(serviceType: string): { serviceType: string };
  getSourceConnectData(
    serviceType: string,
    successCallback: (oauthUrl: string) => string
  ): { serviceType: string; successCallback(oauthUrl: string) };
  getSourceReConnectData(serviceType: string): { serviceType: string };
  getPreContentSourceConfigData(preContentSourceId: string): { preContentSourceId: string };
}

interface SourceConfigData {
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

interface SourceConnectData {
  oauthUrl: string;
  serviceType: string;
}

interface SourceValues {
  contentSource: ContentSourceFullData;
  flashMessages: IFlashMessagesProps;
  dataLoading: boolean;
  sectionLoading: boolean;
  buttonLoading: boolean;
  contentItems: object[];
  contentMeta: Meta;
  contentFilterValue: string;
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
  selectedGithubOrganizationsMap: object;
  selectedGithubOrganizations: object;
}

interface SearchResultsResponse {
  results: object[];
  meta: Meta;
}

interface PreContentSourceResponse {
  id: string;
  serviceType: string;
  githubOrganizations: string[];
}

export const SourceLogic = kea<MakeLogicType<SourceValues, SourceActions>>({
  actions: {
    onInitializeSource: (contentSource: ContentSourceFullData) => contentSource,
    onUpdateSourceName: (name: string) => name,
    setSourceConfigData: (sourceConfigData: SourceConfigData) => sourceConfigData,
    setSourceConnectData: (sourceConnectData: SourceConnectData) => sourceConnectData,
    onUpdateSummary: (summary: object[]) => summary,
    setFlashMessages: (flashMessages: IFlashMessagesProps) => ({ flashMessages }),
    setSearchResults: (searchResultsResponse: SearchResultsResponse) => searchResultsResponse,
    setContentFilterValue: (contentFilterValue: string) => contentFilterValue,
    setActivePage: (activePage: number) => activePage,
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
    initializeSource: (sourceId: string, history: object) => ({ sourceId, history }),
    initializeFederatedSummary: (sourceId: string) => ({ sourceId }),
    searchContentSourceDocuments: (sourceId: string) => ({ sourceId }),
    updateContentSource: (sourceId: string, source: { name: string }) => ({ sourceId, source }),
    removeContentSource: (sourceId: string, successCallback: () => void) => ({
      sourceId,
      successCallback,
    }),
    getSourceConfigData: (serviceType: string) => ({ serviceType }),
    getSourceConnectData: (serviceType: string, successCallback: (oauthUrl: string) => string) => ({
      serviceType,
      successCallback,
    }),
    getSourceReConnectData: (serviceType: string) => ({ serviceType }),
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
  },
  reducers: {
    contentSource: [
      {} as ContentSourceFullData,
      {
        onInitializeSource: (_, contentSource) => contentSource,
        onUpdateSourceName: (contentSource, name) => ({
          ...contentSource,
          name,
        }),
        onUpdateSummary: (contentSource, summary) => ({
          ...contentSource,
          summary,
        }),
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
    flashMessages: [
      {},
      {
        setFlashMessages: (_, { flashMessages }) => flashMessages,
        onUpdateSourceName: (_, name) => ({ success: [`Successfully changed name to ${name}`] }),
        resetSourceState: () => ({}),
        removeContentSource: () => ({}),
        saveSourceConfig: () => ({}),
        getSourceConnectData: () => ({}),
        createContentSource: () => ({}),
      },
    ],
    dataLoading: [
      true,
      {
        onInitializeSource: () => false,
        setSourceConfigData: () => false,
        resetSourceState: () => false,
        setPreContentSourceConfigData: () => false,
      },
    ],
    buttonLoading: [
      false,
      {
        setFlashMessages: () => false,
        setSourceConnectData: () => false,
        setSourceConfigData: () => false,
        resetSourceState: () => false,
        removeContentSource: () => true,
        saveSourceConfig: () => true,
        getSourceConnectData: () => true,
        createContentSource: () => true,
      },
    ],
    sectionLoading: [
      true,
      {
        searchContentSourceDocuments: () => true,
        getPreContentSourceConfigData: () => true,
        setSearchResults: () => false,
        setPreContentSourceConfigData: () => false,
      },
    ],
    contentItems: [
      [],
      {
        setSearchResults: (_, { results }) => results,
      },
    ],
    contentMeta: [
      DEFAULT_META,
      {
        setActivePage: (state, activePage) => setPage(state, activePage),
        setContentFilterValue: (state) => setPage(state, DEFAULT_META.page.current),
        setSearchResults: (_, { meta }) => meta,
      },
    ],
    contentFilterValue: [
      '',
      {
        setContentFilterValue: (_, contentFilterValue) => contentFilterValue,
        resetSourceState: () => '',
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
      {},
      {
        setSelectedGithubOrganizations: (state, option) => ({
          ...state,
          ...{ [option]: !state[option] },
        }),
        resetSourceState: () => [],
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
    initializeSource: ({ sourceId, history }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? routes.fritoPieOrganizationContentSourcePath(sourceId)
        : routes.fritoPieAccountContentSourcePath(sourceId);

      http(route)
        .then(({ data }) => {
          actions.onInitializeSource(data);
          if (data.isFederatedSource) {
            actions.initializeFederatedSummary(sourceId);
          }
        })
        .catch((error) => {
          if (error.response.status === 404) {
            history.push(NOT_FOUND_PATH);
          } else {
            handleAPIError((messages) => actions.setFlashMessages({ error: messages }));
          }
        });
    },
    initializeFederatedSummary: ({ sourceId }) => {
      const route = routes.fritoPieAccountContentSourceFederatedSummaryPath(sourceId);

      http(route)
        .then(({ data }) => actions.onUpdateSummary(data.summary))
        .catch(() => {
          handleAPIError((messages) => actions.setFlashMessages({ error: messages }));
        });
    },
    searchContentSourceDocuments: async ({ sourceId }, breakpoint) => {
      await breakpoint(300);

      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? routes.fritoPieOrganizationContentSourceDocumentsPath(sourceId)
        : routes.fritoPieAccountContentSourceDocumentsPath(sourceId);

      const {
        contentFilterValue: query,
        contentMeta: { page },
      } = values;

      http
        .post(route, { query, page })
        .then(({ data }) => actions.setSearchResults(data))
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
    updateContentSource: ({ sourceId, source }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? routes.fritoPieOrganizationContentSourceSettingsPath(sourceId)
        : routes.fritoPieAccountContentSourceSettingsPath(sourceId);

      http
        .patch(route, { content_source: source })
        .then(({ data }) => actions.onUpdateSourceName(data.name))
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
    removeContentSource: ({ sourceId, successCallback }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? routes.fritoPieOrganizationContentSourcePath(sourceId)
        : routes.fritoPieAccountContentSourcePath(sourceId);

      return http
        .delete(route)
        .then(({ data: { name } }) => {
          SourcesLogic.actions.setFlashMessages({ success: [`Successfully deleted ${name}`] });
          successCallback();
        })
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
    getSourceConfigData: ({ serviceType }) => {
      const route = routes.fritoPieOrganizationSettingsContentSourceOauthConfigurationPath(
        serviceType
      );

      http(route)
        .then(({ data }) => actions.setSourceConfigData(data))
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
    getSourceConnectData: ({ serviceType, successCallback }) => {
      const { isOrganization } = AppLogic.values;
      const { subdomainValue: subdomain, indexPermissionsValue: indexPermissions } = values;

      const route = isOrganization
        ? routes.prepareFritoPieOrganizationContentSourcesPath(serviceType)
        : routes.prepareFritoPieAccountContentSourcesPath(serviceType);

      const params = new URLSearchParams();
      if (subdomain) params.append('subdomain', subdomain);
      if (indexPermissions) params.append('index_permissions', indexPermissions.toString());

      return http(`${route}?${params}`)
        .then(({ data }) => {
          actions.setSourceConnectData(data);
          successCallback(data.oauthUrl);
        })
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
    getSourceReConnectData: ({ serviceType }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? routes.fritoPieOrganizationContentSourceReauthPreparePath(serviceType)
        : routes.fritoPieAccountContentSourceReauthPreparePath(serviceType);

      return http(route)
        .then(({ data }) => actions.setSourceConnectData(data))
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
    getPreContentSourceConfigData: ({ preContentSourceId }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? routes.fritoPieOrganizationPreContentSourcePath(preContentSourceId)
        : routes.fritoPieAccountPreContentSourcePath(preContentSourceId);

      http(route)
        .then(({ data }) => actions.setPreContentSourceConfigData(data))
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
    saveSourceConfig: ({ isUpdating, successCallback }) => {
      const {
        sourceConfigData: { serviceType },
        baseUrlValue,
        clientIdValue,
        clientSecretValue,
        sourceConfigData,
      } = values;

      const route = isUpdating
        ? routes.fritoPieOrganizationSettingsContentSourceOauthConfigurationPath(serviceType)
        : routes.fritoPieOrganizationSettingsContentSourceOauthConfigurationsPath();

      const method = isUpdating ? 'put' : 'post';

      const params = {
        base_url: baseUrlValue || undefined,
        client_id: clientIdValue || undefined,
        client_secret: clientSecretValue || undefined,
        service_type: serviceType,
        private_key: sourceConfigData.configuredFields?.privateKey,
        public_key: sourceConfigData.configuredFields?.publicKey,
        consumer_key: sourceConfigData.configuredFields?.consumerKey,
      };

      return http({ url: route, method, data: params })
        .then(({ data }) => {
          if (isUpdating)
            actions.setFlashMessages({ success: ['Successfully updated configuration.'] });
          actions.setSourceConfigData(data);
          if (successCallback) successCallback();
        })
        .catch(
          handleAPIError((messages) => {
            actions.setFlashMessages({ error: messages });
            if (!isUpdating) throw new Error(messages[0]);
          })
        );
    },
    createContentSource: ({ serviceType, successCallback, errorCallback }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? routes.formCreateFritoPieOrganizationContentSourcesPath()
        : routes.formCreateFritoPieAccountContentSourcesPath();

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
      };

      // Remove undefined values from params
      Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);

      return http
        .post(route, params)
        .then(({ data }) => {
          actions.setCustomSourceData(data);
          successCallback();
        })
        .catch(
          handleAPIError((messages) => {
            actions.setFlashMessages({ error: messages });
            if (errorCallback) errorCallback();
            throw new Error('Auth Error');
          })
        );
    },
  }),
});

const setPage = (state: Meta, page: number) => ({
  ...state,
  page: {
    ...state.page,
    current: page,
  },
});
