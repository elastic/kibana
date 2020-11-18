/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { keys, pickBy } from 'lodash';

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';

import {
  flashAPIErrors,
  setSuccessMessage,
  setQueuedSuccessMessage,
  FlashMessagesLogic,
} from '../../../shared/flash_messages';

import { DEFAULT_META } from '../../../shared/constants';
import { AppLogic } from '../../app_logic';
import { NOT_FOUND_PATH } from '../../routes';
import { ContentSourceFullData, CustomSource, Meta } from '../../types';

export interface SourceActions {
  onInitializeSource(contentSource: ContentSourceFullData): ContentSourceFullData;
  onUpdateSourceName(name: string): string;
  setSourceConfigData(sourceConfigData: SourceConfigData): SourceConfigData;
  setSourceConnectData(sourceConnectData: SourceConnectData): SourceConnectData;
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
  ): { sourceId: string; successCallback(): void };
  createContentSource(
    serviceType: string,
    successCallback: () => void,
    errorCallback?: () => void
  ): { serviceType: string; successCallback(): void; errorCallback?(): void };
  saveSourceConfig(
    isUpdating: boolean,
    successCallback?: () => void
  ): { isUpdating: boolean; successCallback?(): void };
  initializeSource(sourceId: string, history: object): { sourceId: string; history: object };
  getSourceConfigData(serviceType: string): { serviceType: string };
  getSourceConnectData(
    serviceType: string,
    successCallback: (oauthUrl: string) => string
  ): { serviceType: string; successCallback(oauthUrl: string): void };
  getSourceReConnectData(sourceId: string): { sourceId: string };
  getPreContentSourceConfigData(preContentSourceId: string): { preContentSourceId: string };
  setButtonNotLoading(): void;
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

interface OrganizationsMap {
  [key: string]: string | boolean;
}

interface SourceValues {
  contentSource: ContentSourceFullData;
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
  selectedGithubOrganizationsMap: OrganizationsMap;
  selectedGithubOrganizations: string[];
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

const ACCOUNT_CREATE_SOURCE_ROUTE = '/api/workplace_search/account/create_source';
const ORG_CREATE_SOURCE_ROUTE = '/api/workplace_search/org/create_source';

export const SourceLogic = kea<MakeLogicType<SourceValues, SourceActions>>({
  actions: {
    onInitializeSource: (contentSource: ContentSourceFullData) => contentSource,
    onUpdateSourceName: (name: string) => name,
    setSourceConfigData: (sourceConfigData: SourceConfigData) => sourceConfigData,
    setSourceConnectData: (sourceConnectData: SourceConnectData) => sourceConnectData,
    onUpdateSummary: (summary: object[]) => summary,
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
        setButtonNotLoading: () => false,
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
    initializeSource: async ({ sourceId }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? `/api/workplace_search/org/sources/${sourceId}`
        : `/api/workplace_search/account/sources/${sourceId}`;

      try {
        const response = await HttpLogic.values.http.get(route);
        actions.onInitializeSource(response);
        if (response.isFederatedSource) {
          actions.initializeFederatedSummary(sourceId);
        }
      } catch (e) {
        // TODO: Verify this works once components are there. Not sure if the catch gives a status code.
        if (e.response.status === 404) {
          KibanaLogic.values.navigateToUrl(NOT_FOUND_PATH);
        } else {
          flashAPIErrors(e);
        }
      }
    },
    initializeFederatedSummary: async ({ sourceId }) => {
      const route = `/api/workplace_search/org/sources/${sourceId}/federated_summary`;
      try {
        const response = await HttpLogic.values.http.get(route);
        actions.onUpdateSummary(response.summary);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    searchContentSourceDocuments: async ({ sourceId }, breakpoint) => {
      await breakpoint(300);

      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? `/api/workplace_search/org/sources/${sourceId}/documents`
        : `/api/workplace_search/account/sources/${sourceId}/documents`;

      const {
        contentFilterValue: query,
        contentMeta: { page },
      } = values;

      try {
        const response = await HttpLogic.values.http.post(route, {
          body: JSON.stringify({ query, page }),
        });
        actions.setSearchResults(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    updateContentSource: async ({ sourceId, source }) => {
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? `/api/workplace_search/org/sources/${sourceId}/settings`
        : `/api/workplace_search/account/sources/${sourceId}/settings`;

      try {
        const response = await HttpLogic.values.http.patch(route, {
          body: JSON.stringify({ content_source: source }),
        });
        actions.onUpdateSourceName(response.name);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    removeContentSource: async ({ sourceId, successCallback }) => {
      FlashMessagesLogic.actions.clearFlashMessages();
      const { isOrganization } = AppLogic.values;
      const route = isOrganization
        ? `/api/workplace_search/org/sources/${sourceId}`
        : `/api/workplace_search/account/sources/${sourceId}`;

      try {
        const response = await HttpLogic.values.http.delete(route);
        setQueuedSuccessMessage(
          i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.sources.flashMessages.contentSourceRemoved',
            {
              defaultMessage: 'Successfully deleted {sourceName}.',
              values: { sourceName: response.name },
            }
          )
        );
        successCallback();
      } catch (e) {
        flashAPIErrors(e);
      } finally {
        actions.setButtonNotLoading();
      }
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
      FlashMessagesLogic.actions.clearFlashMessages();
      const { isOrganization } = AppLogic.values;
      const { subdomainValue: subdomain, indexPermissionsValue: indexPermissions } = values;

      const route = isOrganization
        ? `/api/workplace_search/org/sources/${serviceType}/prepare`
        : `/api/workplace_search/account/sources/${serviceType}/prepare`;

      const params = new URLSearchParams();
      if (subdomain) params.append('subdomain', subdomain);
      if (indexPermissions) params.append('index_permissions', indexPermissions.toString());

      try {
        const response = await HttpLogic.values.http.get(`${route}?${params}`);
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
      FlashMessagesLogic.actions.clearFlashMessages();
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
        if (successCallback) successCallback();
      } catch (e) {
        flashAPIErrors(e);
        if (!isUpdating) throw new Error(e);
      } finally {
        actions.setButtonNotLoading();
      }
    },
    createContentSource: async ({ serviceType, successCallback, errorCallback }) => {
      FlashMessagesLogic.actions.clearFlashMessages();
      const { isOrganization } = AppLogic.values;
      const route = isOrganization ? ORG_CREATE_SOURCE_ROUTE : ACCOUNT_CREATE_SOURCE_ROUTE;

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
          body: JSON.stringify({ params }),
        });
        actions.setCustomSourceData(response);
        successCallback();
      } catch (e) {
        flashAPIErrors(e);
        if (errorCallback) errorCallback();
        throw new Error('Auth Error');
      } finally {
        actions.setButtonNotLoading();
      }
    },
    onUpdateSourceName: (name: string) => {
      setSuccessMessage(
        i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.sources.flashMessages.contentSourceNameChanged',
          {
            defaultMessage: 'Successfully changed name to {sourceName}.',
            values: { sourceName: name },
          }
        )
      );
    },
    resetSourceState: () => {
      FlashMessagesLogic.actions.clearFlashMessages();
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
