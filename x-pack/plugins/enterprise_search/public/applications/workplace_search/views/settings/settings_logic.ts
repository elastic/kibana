/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import http from 'shared/http';
import routes from 'workplace_search/routes';

import { handleAPIError } from 'app_search/utils/handleAPIError';
import { IFlashMessagesProps } from 'shared/types';
import { AppLogic } from 'workplace_search/App/AppLogic';
import { SourceLogic } from 'workplace_search/ContentSources/SourceLogic';
import { Connector, IObject } from 'workplace_search/types';

import { ORG_SETTINGS_CONNECTORS_PATH } from 'workplace_search/utils/routePaths';

interface IOauthApplication {
  name: string;
  uid: string;
  secret: string;
  redirectUri: string;
  confidential: boolean;
  nativeRedirectUri: string;
}

export interface SettingsServerProps {
  organizationName: string;
  oauthApplication: IOauthApplication;
}

interface SettingsActions {
  onInitializeConnectors(connectors: Connector[]);
  onOrgNameInputChange(orgNameInputValue: string);
  setFlashMessages(flashMessages: IFlashMessagesProps);
  setUpdatedName({ organizationName });
  setServerProps(props: SettingsServerProps);
  setOauthApplication(oauthApplication: IOauthApplication);
  setUpdatedOauthApplication({ oauthApplication }: { oauthApplication: IOauthApplication });
  setConfigDeleted(name: string);
  setTelemetryOptedInUpdating(updating: boolean);
  resetFlashMessages();
  resetSettingsState();
  initializeSettings();
  initializeConnectors();
  updateOauthApplication();
  updateOrgName();
  saveUpdatedConfig();
  deleteSourceConfig(serviceType: string, name: string, history: IObject);
  toggleTelemetryOptIn(checked: boolean);
}

interface SettingsValues {
  flashMessages: IFlashMessagesProps;
  dataLoading: boolean;
  connectors: Connector[];
  orgNameInputValue: string;
  oauthApplication: IOauthApplication | null;
  telemetryOptedInUpdating: boolean;
}

export const SettingsLogic = kea<MakeLogicType<SettingsValues, SettingsActions>>({
  actions: {
    onInitializeConnectors: (connectors: Connector[]) => connectors,
    onOrgNameInputChange: (orgNameInputValue: string) => orgNameInputValue,
    setFlashMessages: (flashMessages: IFlashMessagesProps) => ({ flashMessages }),
    setUpdatedName: ({ organizationName }) => organizationName,
    setServerProps: (props: SettingsServerProps) => props,
    setOauthApplication: (oauthApplication: IOauthApplication) => oauthApplication,
    setUpdatedOauthApplication: ({ oauthApplication }: { oauthApplication: IOauthApplication }) =>
      oauthApplication,
    setConfigDeleted: (name: string) => name,
    setTelemetryOptedInUpdating: (updating: boolean) => ({ updating }),
    resetFlashMessages: () => true,
    resetSettingsState: () => true,
    initializeSettings: () => true,
    initializeConnectors: () => true,
    updateOrgName: () => true,
    updateOauthApplication: () => true,
    saveUpdatedConfig: () => true,
    deleteSourceConfig: (serviceType: string, name: string, history: IObject) => ({
      serviceType,
      name,
      history,
    }),
    toggleTelemetryOptIn: (checked: boolean) => ({ checked }),
  },
  reducers: {
    connectors: [
      [],
      {
        onInitializeConnectors: (_, connectors) => connectors,
      },
    ],
    orgNameInputValue: [
      '',
      {
        setServerProps: (_, { organizationName }) => organizationName,
        onOrgNameInputChange: (_, orgNameInputValue) => orgNameInputValue,
        setUpdatedName: (_, organizationName) => organizationName,
      },
    ],
    oauthApplication: [
      null,
      {
        setServerProps: (_, { oauthApplication }) => oauthApplication,
        setOauthApplication: (_, oauthApplication) => oauthApplication,
        setUpdatedOauthApplication: (_, oauthApplication) => oauthApplication,
      },
    ],
    flashMessages: [
      {},
      {
        setFlashMessages: (_, { flashMessages }) => flashMessages,
        setUpdatedName: () => ({ success: ['Successfully updated organization.'] }),
        setUpdatedOauthApplication: () => ({ success: ['Successfully updated application.'] }),
        setConfigDeleted: (_, name) => ({
          success: [`Successfully removed configuration for ${name}.`],
        }),
        resetSettingsState: () => ({}),
        resetFlashMessages: () => ({}),
      },
    ],
    dataLoading: [
      true,
      {
        onInitializeConnectors: () => false,
        resetSettingsState: () => true,
      },
    ],
    telemetryOptedInUpdating: [
      false,
      {
        setTelemetryOptedInUpdating: (_, { updating }) => updating,
        setFlashMessages: () => false,
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    initializeSettings: () => {
      const route = routes.fritoPieOrganizationSettingsPath();
      http(route)
        .then(({ data }) => actions.setServerProps(data))
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
    initializeConnectors: () => {
      const route = routes.fritoPieOrganizationSettingsContentSourceOauthConfigurationsPath();

      http(route)
        .then(({ data }) => actions.onInitializeConnectors(data))
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
    updateOrgName: () => {
      const route = routes.customizeFritoPieOrganizationSettingsPath();
      const { orgNameInputValue: name } = values;

      http
        .put(route, { name })
        .then(({ data }) => {
          actions.setUpdatedName(data);
          AppLogic.actions.setUpdatedOrgName(data);
        })
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
    updateOauthApplication: () => {
      const route = routes.oauthApplicationFritoPieOrganizationSettingsPath();
      const oauthApplication = values.oauthApplication || ({} as IOauthApplication);
      const { name, redirectUri, confidential } = oauthApplication;

      actions.resetFlashMessages();

      http
        .put(route, { oauth_application: { name, confidential, redirect_uri: redirectUri } })
        .then(({ data }) => actions.setUpdatedOauthApplication(data))
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
    saveUpdatedConfig: () => {
      SourceLogic.actions.saveSourceConfig(true, () =>
        actions.setFlashMessages(SourceLogic.values.flashMessages)
      );
    },
    deleteSourceConfig: ({ serviceType, name, history }) => {
      const route = routes.fritoPieOrganizationSettingsContentSourceOauthConfigurationPath(
        serviceType
      );

      http
        .delete(route)
        .then(() => {
          history.push(ORG_SETTINGS_CONNECTORS_PATH);
          actions.setConfigDeleted(name);
        })
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
    toggleTelemetryOptIn: ({ checked }) => {
      actions.setTelemetryOptedInUpdating(true);
      http
        .put(routes.fritoPieTelemetryPath(), { opt_in: checked })
        .then(({ data }) => {
          AppLogic.actions.setTelemetryStatus(data.telemetryStatus);
          actions.setTelemetryOptedInUpdating(false);
        })
        .catch(handleAPIError((messages) => actions.setFlashMessages({ error: messages })));
    },
  }),
});
