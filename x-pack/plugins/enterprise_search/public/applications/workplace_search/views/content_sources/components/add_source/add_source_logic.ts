/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Search } from 'history';
import { kea, MakeLogicType } from 'kea';
import { keys, pickBy } from 'lodash';

import { i18n } from '@kbn/i18n';

import {
  flashAPIErrors,
  flashSuccessToast,
  clearFlashMessages,
  setErrorMessage,
} from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { KibanaLogic } from '../../../../../shared/kibana';
import { AppLogic } from '../../../../app_logic';
import { SOURCES_PATH, PRIVATE_SOURCES_PATH, getSourcesPath, getAddPath } from '../../../../routes';
import { SourceDataItem } from '../../../../types';
import { PERSONAL_DASHBOARD_SOURCE_ERROR } from '../../constants';
import { getSourceData } from '../../source_data';
import { SourcesLogic } from '../../sources_logic';

import {
  ExternalConnectorLogic,
  isValidExternalUrl,
} from './add_external_connector/external_connector_logic';

export interface AddSourceProps {
  serviceType: string;
  initialStep?: string;
}

export enum AddSourceSteps {
  SaveConfigStep = 'Save Config',
  ConfigCompletedStep = 'Config Completed',
  ConnectInstanceStep = 'Connect Instance',
  ConfigureOauthStep = 'Configure Oauth',
  ReauthenticateStep = 'Reauthenticate',
}

export interface OauthParams {
  code: string;
  state: string;
  session_state: string;
  oauth_verifier?: string;
  error?: string;
  error_description?: string;
}

export interface AddSourceActions {
  setAddSourceStep(addSourceCurrentStep: AddSourceSteps): AddSourceSteps;
  setSourceConfigData(sourceConfigData: SourceConfigData): SourceConfigData;
  setSourceConnectData(sourceConnectData: SourceConnectData): SourceConnectData;
  setConfiguredField(key: string, value: string): { key: string; value: string };
  setSourceLoginValue(loginValue: string): string;
  setSourcePasswordValue(passwordValue: string): string;
  setSourceSubdomainValue(subdomainValue: string): string;
  setSourceIndexPermissionsValue(indexPermissionsValue: boolean): boolean;
  setPreContentSourceConfigData(data: PreContentSourceResponse): PreContentSourceResponse;
  setPreContentSourceId(preContentSourceId: string): string;
  setSelectedGithubOrganizations(option: string): string;
  resetSourceState(): void;
  createContentSource(
    successCallback: () => void,
    errorCallback?: () => void
  ): { successCallback(): void; errorCallback?(): void };
  saveSourceConfig(
    isUpdating: boolean,
    successCallback?: () => void
  ): { isUpdating: boolean; successCallback?(): void };
  saveSourceParams(
    search: Search,
    params: OauthParams,
    isOrganization: boolean
  ): { search: Search; params: OauthParams; isOrganization: boolean };
  getSourceConfigData(): void;
  getSourceConnectData(successCallback: (oauthUrl: string) => void): {
    successCallback(oauthUrl: string): void;
  };
  getSourceReConnectData(sourceId: string): { sourceId: string };
  getPreContentSourceConfigData(): void;
  setButtonNotLoading(): void;
  setFirstStep(): void;
}

export interface SourceConfigFormElement {
  key: string;
  label: string;
}

export interface SourceConfigData {
  serviceType: string;
  baseServiceType?: string;
  name: string;
  configured: boolean;
  externalConnectorServiceDescribed?: boolean;
  categories: string[];
  needsPermissions?: boolean;
  privateSourcesEnabled: boolean;
  configuredFields: {
    [key: string]: string;
  };
  accountContextOnly?: boolean;
  isOauth?: boolean;
  configurableFields?: SourceConfigFormElement[];
  connectionRequiresRedirect?: boolean;
}

export interface SourceConnectData {
  oauthUrl: string;
  serviceType: string;
}

export interface OrganizationsMap {
  [key: string]: string | boolean;
}

export interface AddSourceValues {
  addSourceCurrentStep: AddSourceSteps | null;
  dataLoading: boolean;
  sectionLoading: boolean;
  buttonLoading: boolean;
  loginValue: string;
  passwordValue: string;
  subdomainValue: string;
  indexPermissionsValue: boolean;
  sourceConfigData: SourceConfigData;
  sourceConnectData: SourceConnectData;
  githubOrganizations: string[];
  selectedGithubOrganizationsMap: OrganizationsMap;
  selectedGithubOrganizations: string[];
  preContentSourceId: string;
  oauthConfigCompleted: boolean;
  sourceData: SourceDataItem | null;
  configuredFields: { [key: string]: string };
}

interface PreContentSourceResponse {
  id: string;
  serviceType: string;
  githubOrganizations: string[];
}

export const AddSourceLogic = kea<MakeLogicType<AddSourceValues, AddSourceActions, AddSourceProps>>(
  {
    path: ['enterprise_search', 'workplace_search', 'add_source_logic'],
    actions: {
      setAddSourceStep: (addSourceCurrentStep: AddSourceSteps) => addSourceCurrentStep,
      setSourceConfigData: (sourceConfigData: SourceConfigData) => sourceConfigData,
      setSourceConnectData: (sourceConnectData: SourceConnectData) => sourceConnectData,
      setConfiguredField: (key, value) => ({ key, value }),
      setSourceLoginValue: (loginValue: string) => loginValue,
      setSourcePasswordValue: (passwordValue: string) => passwordValue,
      setSourceSubdomainValue: (subdomainValue: string) => subdomainValue,
      setSourceIndexPermissionsValue: (indexPermissionsValue: boolean) => indexPermissionsValue,
      setPreContentSourceConfigData: (data: PreContentSourceResponse) => data,
      setPreContentSourceId: (preContentSourceId: string) => preContentSourceId,
      setSelectedGithubOrganizations: (option: string) => option,
      getSourceConfigData: () => true,
      getSourceConnectData: (successCallback: (oauthUrl: string) => string) => ({
        successCallback,
      }),
      getSourceReConnectData: (sourceId: string) => ({ sourceId }),
      getPreContentSourceConfigData: () => true,
      saveSourceConfig: (isUpdating: boolean, successCallback?: () => void) => ({
        isUpdating,
        successCallback,
      }),
      saveSourceParams: (search: Search, params: OauthParams, isOrganization: boolean) => ({
        search,
        params,
        isOrganization,
      }),
      createContentSource: (successCallback: () => void, errorCallback?: () => void) => ({
        successCallback,
        errorCallback,
      }),
      resetSourceState: () => true,
      setButtonNotLoading: () => true,
      setFirstStep: () => true,
    },
    reducers: ({ props }) => ({
      addSourceCurrentStep: [
        null,
        {
          // @ts-expect-error upgrade typescript v5.1.6
          setAddSourceStep: (_, addSourceCurrentStep) => addSourceCurrentStep,
        },
      ],
      sourceConfigData: [
        {} as SourceConfigData,
        {
          // @ts-expect-error upgrade typescript v5.1.6
          setSourceConfigData: (_, sourceConfigData) => sourceConfigData,
        },
      ],
      sourceConnectData: [
        {} as SourceConnectData,
        {
          // @ts-expect-error upgrade typescript v5.1.6
          setSourceConnectData: (_, sourceConnectData) => sourceConnectData,
        },
      ],
      dataLoading: [
        true,
        {
          setSourceConfigData: () => false,
          resetSourceState: () => false,
          setPreContentSourceConfigData: () => false,
          getSourceConfigData: () => true,
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
      loginValue: [
        '',
        {
          // @ts-expect-error upgrade typescript v5.1.6
          setSourceLoginValue: (_, loginValue) => loginValue,
          resetSourceState: () => '',
        },
      ],
      passwordValue: [
        '',
        {
          // @ts-expect-error upgrade typescript v5.1.6
          setSourcePasswordValue: (_, passwordValue) => passwordValue,
          resetSourceState: () => '',
        },
      ],
      subdomainValue: [
        '',
        {
          // @ts-expect-error upgrade typescript v5.1.6
          setSourceSubdomainValue: (_, subdomainValue) => subdomainValue,
          resetSourceState: () => '',
        },
      ],
      indexPermissionsValue: [
        false,
        {
          // @ts-expect-error upgrade typescript v5.1.6
          setSourceIndexPermissionsValue: (_, indexPermissionsValue) => indexPermissionsValue,
          resetSourceState: () => false,
        },
      ],
      githubOrganizations: [
        [],
        {
          // @ts-expect-error upgrade typescript v5.1.6
          setPreContentSourceConfigData: (_, { githubOrganizations }) => githubOrganizations,
          resetSourceState: () => [],
        },
      ],
      selectedGithubOrganizationsMap: [
        {} as OrganizationsMap,
        {
          // @ts-expect-error upgrade typescript v5.1.6
          setSelectedGithubOrganizations: (state, option) => ({
            ...state,
            ...{ [option]: !state[option] },
          }),
          resetSourceState: () => ({}),
        },
      ],
      preContentSourceId: [
        '',
        {
          // @ts-expect-error upgrade typescript v5.1.6
          setPreContentSourceId: (_, preContentSourceId) => preContentSourceId,
          setPreContentSourceConfigData: () => '',
          resetSourceState: () => '',
        },
      ],
      oauthConfigCompleted: [
        false,
        {
          setPreContentSourceConfigData: () => true,
        },
      ],
      sourceData: [getSourceData(props.serviceType) || null, {}],
      configuredFields: [
        {},
        {
          // @ts-expect-error upgrade typescript v5.1.6
          setSourceConfigData: (_, { configuredFields }) => configuredFields,
          // @ts-expect-error upgrade typescript v5.1.6
          setConfiguredField: (configuredFields, { key, value }) => ({
            ...configuredFields,
            [key]: value,
          }),
          resetSourceState: () => ({}),
        },
      ],
    }),
    selectors: ({ selectors }) => ({
      selectedGithubOrganizations: [
        () => [selectors.selectedGithubOrganizationsMap],
        (orgsMap) => keys(pickBy(orgsMap)),
      ],
    }),
    listeners: ({ actions, values, props }) => ({
      getSourceConfigData: async () => {
        const { serviceType } = props;
        // TODO: Once multi-config support for connectors is added, this request url will need to include an ID
        const route = `/internal/workplace_search/org/settings/connectors/${serviceType}`;

        try {
          const response = await HttpLogic.values.http.get<SourceConfigData>(route);
          actions.setSourceConfigData(response);
          actions.setFirstStep();
        } catch (e) {
          flashAPIErrors(e);
        }
      },
      getSourceConnectData: async ({ successCallback }) => {
        const { serviceType } = props;
        clearFlashMessages();
        const { isOrganization } = AppLogic.values;
        const { subdomainValue: subdomain, indexPermissionsValue: indexPermissions } = values;

        const route = isOrganization
          ? `/internal/workplace_search/org/sources/${serviceType}/prepare`
          : `/internal/workplace_search/account/sources/${serviceType}/prepare`;

        const indexPermissionsQuery = isOrganization
          ? { index_permissions: indexPermissions }
          : undefined;

        const query = subdomain
          ? {
              ...indexPermissionsQuery,
              subdomain,
            }
          : { ...indexPermissionsQuery };

        try {
          const response = await HttpLogic.values.http.get<SourceConnectData>(route, {
            query,
          });
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
          ? `/internal/workplace_search/org/sources/${sourceId}/reauth_prepare`
          : `/internal/workplace_search/account/sources/${sourceId}/reauth_prepare`;

        try {
          const response = await HttpLogic.values.http.get<SourceConnectData>(route);
          actions.setSourceConnectData(response);
        } catch (e) {
          flashAPIErrors(e);
        }
      },
      getPreContentSourceConfigData: async () => {
        const { isOrganization } = AppLogic.values;
        const { preContentSourceId } = values;
        const route = isOrganization
          ? `/internal/workplace_search/org/pre_sources/${preContentSourceId}`
          : `/internal/workplace_search/account/pre_sources/${preContentSourceId}`;

        try {
          const response = await HttpLogic.values.http.get<PreContentSourceResponse>(route);
          actions.setPreContentSourceConfigData(response);
        } catch (e) {
          flashAPIErrors(e);
        }
      },
      saveSourceConfig: async ({ isUpdating, successCallback }) => {
        clearFlashMessages();
        const { serviceType } = props;
        const { externalConnectorUrl, externalConnectorApiKey } = ExternalConnectorLogic.values;
        if (
          serviceType === 'external' &&
          externalConnectorUrl &&
          !isValidExternalUrl(externalConnectorUrl)
        ) {
          ExternalConnectorLogic.actions.setUrlValidation(false);
          actions.setButtonNotLoading();
          return;
        }

        const route = isUpdating
          ? `/internal/workplace_search/org/settings/connectors/${serviceType}`
          : '/internal/workplace_search/org/settings/connectors';

        const http = isUpdating ? HttpLogic.values.http.put : HttpLogic.values.http.post;

        const params = {
          ...values.configuredFields,
          external_connector_url: serviceType === 'external' ? externalConnectorUrl : undefined,
          external_connector_api_key:
            serviceType === 'external' ? externalConnectorApiKey : undefined,
          service_type: serviceType,
        };

        try {
          const response = await http<SourceConfigData>(route, {
            body: JSON.stringify(params),
          });
          if (successCallback) successCallback();
          if (isUpdating) {
            flashSuccessToast(
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
      saveSourceParams: async ({ search, params, isOrganization }) => {
        const { http } = HttpLogic.values;
        const { navigateToUrl } = KibanaLogic.values;
        const { setAddedSource } = SourcesLogic.actions;
        const query = { ...params };
        const route = '/internal/workplace_search/sources/create';

        /**
        There is an extreme edge case where the user is trying to connect Github as source from ent-search,
        after configuring it in Kibana. When this happens, Github redirects the user from ent-search to Kibana
        with special error properties in the query params. In this case we need to redirect the user to the
        app home page and display the error message, and not persist the other query params to the server.
      */
        if (params.error_description) {
          navigateToUrl(isOrganization ? '/' : PRIVATE_SOURCES_PATH);
          setErrorMessage(
            isOrganization
              ? params.error_description
              : PERSONAL_DASHBOARD_SOURCE_ERROR(params.error_description)
          );
          return;
        }

        try {
          const response = await http.get<{
            serviceName: string;
            indexPermissions: boolean;
            serviceType: string;
            preContentSourceId: string;
            hasConfigureStep: boolean;
          }>(route, { query });
          const {
            serviceName,
            indexPermissions,
            serviceType,
            preContentSourceId,
            hasConfigureStep,
          } = response;

          // GitHub requires an intermediate configuration step, where we collect the repos to index.
          if (hasConfigureStep && !values.oauthConfigCompleted) {
            actions.setPreContentSourceId(preContentSourceId);
            navigateToUrl(
              getSourcesPath(`${getAddPath('github')}/configure${search}`, isOrganization)
            );
          } else {
            setAddedSource(serviceName, indexPermissions, serviceType);
            navigateToUrl(getSourcesPath(SOURCES_PATH, isOrganization));
          }
        } catch (e) {
          navigateToUrl(getSourcesPath(SOURCES_PATH, isOrganization));
          flashAPIErrors(e);
        }
      },
      setFirstStep: () => {
        const firstStep = getFirstStep(values.sourceConfigData, props.initialStep);
        actions.setAddSourceStep(firstStep);
      },
      createContentSource: async ({ successCallback, errorCallback }) => {
        const { serviceType } = props;
        clearFlashMessages();
        const { isOrganization } = AppLogic.values;
        const route = isOrganization
          ? '/internal/workplace_search/org/create_source'
          : '/internal/workplace_search/account/create_source';

        const {
          selectedGithubOrganizations: githubOrganizations,
          loginValue,
          passwordValue,
          indexPermissionsValue,
        } = values;

        const params = {
          service_type: serviceType,
          login: loginValue || undefined,
          password: passwordValue || undefined,
          organizations: githubOrganizations.length > 0 ? githubOrganizations : undefined,
          index_permissions: indexPermissionsValue || undefined,
        } as {
          [key: string]: string | string[] | undefined;
        };

        // Remove undefined values from params
        Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);

        try {
          await HttpLogic.values.http.post(route, {
            body: JSON.stringify({ ...params }),
          });
          successCallback();
        } catch (e) {
          flashAPIErrors(e);
          if (errorCallback) errorCallback();
        } finally {
          actions.setButtonNotLoading();
        }
      },
    }),
  }
);

const getFirstStep = (sourceConfigData: SourceConfigData, initialStep?: string): AddSourceSteps => {
  const { configured } = sourceConfigData;
  if (initialStep === 'connect') return AddSourceSteps.ConnectInstanceStep;
  if (initialStep === 'configure') return AddSourceSteps.ConfigureOauthStep;
  if (initialStep === 'reauthenticate') return AddSourceSteps.ReauthenticateStep;
  if (configured) return AddSourceSteps.ConnectInstanceStep;
  return AddSourceSteps.SaveConfigStep;
};
