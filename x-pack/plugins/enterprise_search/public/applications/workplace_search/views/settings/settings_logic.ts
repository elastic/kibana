/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import {
  clearFlashMessages,
  flashSuccessToast,
  flashAPIErrors,
} from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { AppLogic } from '../../app_logic';
import { ORG_UPDATED_MESSAGE, OAUTH_APP_UPDATED_MESSAGE } from '../../constants';
import { ORG_SETTINGS_CONNECTORS_PATH } from '../../routes';
import { Connector } from '../../types';
import { sortByName } from '../../utils';

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
  logo: string | null;
  icon: string | null;
}

interface SettingsActions {
  onInitializeConnectors(connectors: Connector[]): Connector[];
  onOrgNameInputChange(orgNameInputValue: string): string;
  setUpdatedName({ organizationName }: { organizationName: string }): string;
  setServerProps(props: SettingsServerProps): SettingsServerProps;
  setIcon(icon: string | null): string | null;
  setStagedIcon(stagedIcon: string | null): string | null;
  setLogo(logo: string | null): string | null;
  setStagedLogo(stagedLogo: string | null): string | null;
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
  updateOrgLogo(): void;
  updateOrgIcon(): void;
  resetOrgLogo(): void;
  resetOrgIcon(): void;
  resetButtonLoading(): void;
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
  logo: string | null;
  icon: string | null;
  stagedLogo: string | null;
  stagedIcon: string | null;
  logoButtonLoading: boolean;
  iconButtonLoading: boolean;
}

const imageRoute = '/internal/workplace_search/org/settings/upload_images';

export const SettingsLogic = kea<MakeLogicType<SettingsValues, SettingsActions>>({
  actions: {
    onInitializeConnectors: (connectors: Connector[]) => connectors,
    onOrgNameInputChange: (orgNameInputValue: string) => orgNameInputValue,
    setUpdatedName: ({ organizationName }) => organizationName,
    setServerProps: (props: SettingsServerProps) => props,
    setIcon: (icon) => icon,
    setStagedIcon: (stagedIcon) => stagedIcon,
    setLogo: (logo) => logo,
    setStagedLogo: (stagedLogo) => stagedLogo,
    setOauthApplication: (oauthApplication: IOauthApplication) => oauthApplication,
    setUpdatedOauthApplication: ({ oauthApplication }: { oauthApplication: IOauthApplication }) =>
      oauthApplication,
    resetSettingsState: () => true,
    initializeSettings: () => true,
    initializeConnectors: () => true,
    updateOrgName: () => true,
    updateOrgLogo: () => true,
    updateOrgIcon: () => true,
    resetOrgLogo: () => true,
    resetOrgIcon: () => true,
    resetButtonLoading: () => true,
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
        onInitializeConnectors: (_, connectors) => sortByName(connectors),
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
        setServerProps: () => false,
        onInitializeConnectors: () => false,
        resetSettingsState: () => true,
      },
    ],
    logo: [
      null,
      {
        setServerProps: (_, { logo }) => logo,
        setLogo: (_, logo) => logo,
        resetOrgLogo: () => null,
      },
    ],
    stagedLogo: [
      null,
      {
        setStagedLogo: (_, stagedLogo) => stagedLogo,
        resetOrgLogo: () => null,
        setLogo: () => null,
      },
    ],
    icon: [
      null,
      {
        setServerProps: (_, { icon }) => icon,
        setIcon: (_, icon) => icon,
        resetOrgIcon: () => null,
      },
    ],
    stagedIcon: [
      null,
      {
        setStagedIcon: (_, stagedIcon) => stagedIcon,
        resetOrgIcon: () => null,
        setIcon: () => null,
      },
    ],
    logoButtonLoading: [
      false,
      {
        updateOrgLogo: () => true,
        setLogo: () => false,
        resetButtonLoading: () => false,
      },
    ],
    iconButtonLoading: [
      false,
      {
        updateOrgIcon: () => true,
        setIcon: () => false,
        resetButtonLoading: () => false,
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    initializeSettings: async () => {
      const { http } = HttpLogic.values;
      const route = '/internal/workplace_search/org/settings';

      try {
        const response = await http.get<SettingsServerProps>(route);
        actions.setServerProps(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    initializeConnectors: async () => {
      const { http } = HttpLogic.values;
      const route = '/internal/workplace_search/org/settings/connectors';

      try {
        const response = await http.get<Connector[]>(route);
        actions.onInitializeConnectors(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    updateOrgName: async () => {
      clearFlashMessages();
      const { http } = HttpLogic.values;
      const route = '/internal/workplace_search/org/settings/customize';
      const { orgNameInputValue: name } = values;
      const body = JSON.stringify({ name });

      try {
        const response = await http.put<{
          organizationName: string;
        }>(route, { body });
        actions.setUpdatedName(response);
        flashSuccessToast(ORG_UPDATED_MESSAGE);
        AppLogic.actions.setOrgName(name);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    updateOrgLogo: async () => {
      clearFlashMessages();
      const { http } = HttpLogic.values;
      const { stagedLogo: logo } = values;
      const body = JSON.stringify({ logo });

      try {
        const response = await http.put<{ logo: string | null }>(imageRoute, { body });
        actions.setLogo(response.logo);
        flashSuccessToast(ORG_UPDATED_MESSAGE);
      } catch (e) {
        actions.resetButtonLoading();
        flashAPIErrors(e);
      }
    },
    updateOrgIcon: async () => {
      clearFlashMessages();
      const { http } = HttpLogic.values;
      const { stagedIcon: icon } = values;
      const body = JSON.stringify({ icon });

      try {
        const response = await http.put<{ icon: string | null }>(imageRoute, { body });
        actions.setIcon(response.icon);
        flashSuccessToast(ORG_UPDATED_MESSAGE);
      } catch (e) {
        actions.resetButtonLoading();
        flashAPIErrors(e);
      }
    },
    updateOauthApplication: async () => {
      const { http } = HttpLogic.values;
      const route = '/internal/workplace_search/org/settings/oauth_application';
      const oauthApplication = values.oauthApplication || ({} as IOauthApplication);
      const { name, redirectUri, confidential } = oauthApplication;
      const body = JSON.stringify({
        oauth_application: { name, confidential, redirect_uri: redirectUri },
      });

      clearFlashMessages();

      try {
        const response = await http.put<{
          oauthApplication: IOauthApplication;
        }>(route, { body });
        actions.setUpdatedOauthApplication(response);
        flashSuccessToast(OAUTH_APP_UPDATED_MESSAGE);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    deleteSourceConfig: async ({ serviceType, name }) => {
      const { http } = HttpLogic.values;
      const route = `/internal/workplace_search/org/settings/connectors/${serviceType}`;

      try {
        await http.delete(route);
        KibanaLogic.values.navigateToUrl(ORG_SETTINGS_CONNECTORS_PATH);
        flashSuccessToast(
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
    setStagedLogo: () => {
      clearFlashMessages();
    },
    setStagedIcon: () => {
      clearFlashMessages();
    },
    resetOrgLogo: () => {
      actions.updateOrgLogo();
    },
    resetOrgIcon: () => {
      actions.updateOrgIcon();
    },
  }),
});
