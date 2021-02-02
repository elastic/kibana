/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';
import { i18n } from '@kbn/i18n';

import {
  clearFlashMessages,
  setQueuedSuccessMessage,
  setSuccessMessage,
  flashAPIErrors,
} from '../../../shared/flash_messages';
import { KibanaLogic } from '../../../shared/kibana';
import { HttpLogic } from '../../../shared/http';

import { Connector } from '../../types';
import { ORG_UPDATED_MESSAGE, OAUTH_APP_UPDATED_MESSAGE } from '../../constants';

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
    initializeSettings: async () => {
      const { http } = HttpLogic.values;
      const route = '/api/workplace_search/org/settings';

      try {
        const response = await http.get(route);
        actions.setServerProps(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    initializeConnectors: async () => {
      const { http } = HttpLogic.values;
      const route = '/api/workplace_search/org/settings/connectors';

      try {
        const response = await http.get(route);
        actions.onInitializeConnectors(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    updateOrgName: async () => {
      const { http } = HttpLogic.values;
      const route = '/api/workplace_search/org/settings/customize';
      const { orgNameInputValue: name } = values;
      const body = JSON.stringify({ name });

      try {
        const response = await http.put(route, { body });
        actions.setUpdatedName(response);
        setSuccessMessage(ORG_UPDATED_MESSAGE);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    updateOauthApplication: async () => {
      const { http } = HttpLogic.values;
      const route = '/api/workplace_search/org/settings/oauth_application';
      const oauthApplication = values.oauthApplication || ({} as IOauthApplication);
      const { name, redirectUri, confidential } = oauthApplication;
      const body = JSON.stringify({
        oauth_application: { name, confidential, redirect_uri: redirectUri },
      });

      clearFlashMessages();

      try {
        const response = await http.put(route, { body });
        actions.setUpdatedOauthApplication(response);
        setSuccessMessage(OAUTH_APP_UPDATED_MESSAGE);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    deleteSourceConfig: async ({ serviceType, name }) => {
      const { http } = HttpLogic.values;
      const route = `/api/workplace_search/org/settings/connectors/${serviceType}`;

      try {
        await http.delete(route);
        KibanaLogic.values.navigateToUrl(ORG_SETTINGS_CONNECTORS_PATH);
        setQueuedSuccessMessage(
          i18n.translate('xpack.enterpriseSearch.workplaceSearch.settings.configRemoved.message', {
            defaultMessage: 'Successfully removed configuration for {name}.',
            values: { name },
          })
        );
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    resetSettingsState: () => {
      clearFlashMessages();
    },
  }),
});
