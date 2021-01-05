/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import http from 'shared/http';
import routes from 'workplace_search/routes';

import {
  clearFlashMessages,
  setQueuedSuccessMessage,
  setSuccessMessage,
  flashAPIErrors,
} from '../../../shared/flash_messages';
import { KibanaLogic } from '../../../shared/kibana';

import { Connector } from '../../types';

import { ORG_SETTINGS_CONNECTORS_PATH } from '../../routes';

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
  onInitializeConnectors(connectors: Connector[]): Connector[];
  onOrgNameInputChange(orgNameInputValue: string): string;
  setUpdatedName({ organizationName }: { organizationName: string }): string;
  setServerProps(props: SettingsServerProps): SettingsServerProps;
  setOauthApplication(oauthApplication: IOauthApplication): IOauthApplication;
  setUpdatedOauthApplication({
    oauthApplication,
  }: {
    oauthApplication: IOauthApplication;
  }): IOauthApplication;
  resetSettingsState(): void;
  initializeSettings(): void;
  initializeConnectors(): void;
  updateOauthApplication(): void;
  updateOrgName(): void;
  deleteSourceConfig(
    serviceType: string,
    name: string
  ): {
    serviceType: string;
    name: string;
  };
}

interface SettingsValues {
  dataLoading: boolean;
  connectors: Connector[];
  orgNameInputValue: string;
  oauthApplication: IOauthApplication | null;
}

export const SettingsLogic = kea<MakeLogicType<SettingsValues, SettingsActions>>({
  actions: {
    onInitializeConnectors: (connectors: Connector[]) => connectors,
    onOrgNameInputChange: (orgNameInputValue: string) => orgNameInputValue,
    setUpdatedName: ({ organizationName }) => organizationName,
    setServerProps: (props: SettingsServerProps) => props,
    setOauthApplication: (oauthApplication: IOauthApplication) => oauthApplication,
    setUpdatedOauthApplication: ({ oauthApplication }: { oauthApplication: IOauthApplication }) =>
      oauthApplication,
    resetSettingsState: () => true,
    initializeSettings: () => true,
    initializeConnectors: () => true,
    updateOrgName: () => true,
    updateOauthApplication: () => true,
    deleteSourceConfig: (serviceType: string, name: string) => ({
      serviceType,
      name,
    }),
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
    dataLoading: [
      true,
      {
        onInitializeConnectors: () => false,
        resetSettingsState: () => true,
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    initializeSettings: () => {
      const route = routes.fritoPieOrganizationSettingsPath();
      http(route)
        .then(({ data }) => actions.setServerProps(data))
        .catch((e) => flashAPIErrors(e));
    },
    initializeConnectors: () => {
      const route = routes.fritoPieOrganizationSettingsContentSourceOauthConfigurationsPath();

      http(route)
        .then(({ data }) => actions.onInitializeConnectors(data))
        .catch((e) => flashAPIErrors(e));
    },
    updateOrgName: () => {
      const route = routes.customizeFritoPieOrganizationSettingsPath();
      const { orgNameInputValue: name } = values;

      http
        .put(route, { name })
        .then(({ data }) => {
          actions.setUpdatedName(data);
          setSuccessMessage('Successfully updated organization.');
        })
        .catch((e) => flashAPIErrors(e));
    },
    updateOauthApplication: () => {
      const route = routes.oauthApplicationFritoPieOrganizationSettingsPath();
      const oauthApplication = values.oauthApplication || ({} as IOauthApplication);
      const { name, redirectUri, confidential } = oauthApplication;

      clearFlashMessages();

      http
        .put(route, { oauth_application: { name, confidential, redirect_uri: redirectUri } })
        .then(({ data }) => {
          actions.setUpdatedOauthApplication(data);
          setSuccessMessage('Successfully updated application.');
        })
        .catch((e) => flashAPIErrors(e));
    },
    deleteSourceConfig: ({ serviceType, name }) => {
      const route = routes.fritoPieOrganizationSettingsContentSourceOauthConfigurationPath(
        serviceType
      );

      http
        .delete(route)
        .then(() => {
          KibanaLogic.values.navigateToUrl(ORG_SETTINGS_CONNECTORS_PATH);
          setQueuedSuccessMessage(`Successfully removed configuration for ${name}.`);
        })
        .catch((e) => flashAPIErrors(e));
    },
    resetSettingsState: () => {
      clearFlashMessages();
    },
  }),
});
