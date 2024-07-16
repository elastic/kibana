/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FC } from 'react';

import { kea, MakeLogicType } from 'kea';

import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { CloudSetup } from '@kbn/cloud-plugin/public';
import { ConsolePluginStart } from '@kbn/console-plugin/public';
import {
  ApplicationStart,
  Capabilities,
  ChromeBreadcrumb,
  ScopedHistory,
  IUiSettingsClient,
  ChromeStart,
  SecurityServiceStart,
} from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';

import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import { IndexMappingProps } from '@kbn/index-management';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { MlPluginStart } from '@kbn/ml-plugin/public';
import { ELASTICSEARCH_URL_PLACEHOLDER } from '@kbn/search-api-panels/constants';
import { ConnectorDefinition } from '@kbn/search-connectors-plugin/public';
import type { SearchHomepagePluginStart } from '@kbn/search-homepage/public';
import { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/public';
import { SearchPlaygroundPluginStart } from '@kbn/search-playground/public';
import { AuthenticatedUser, SecurityPluginStart } from '@kbn/security-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';

import { ClientConfigType, ProductAccess, ProductFeatures } from '../../../../common/types';
import { ESConfig, UpdateSideNavDefinitionFn } from '../../../plugin';

import { HttpLogic } from '../http';
import { createHref, CreateHrefOptions } from '../react_router_helpers';

type RequiredFieldsOnly<T> = {
  [K in keyof T as T[K] extends Required<T>[K] ? K : never]: T[K];
};
export interface KibanaLogicProps {
  application: ApplicationStart;
  capabilities: Capabilities;
  charts?: ChartsPluginStart;
  cloud?: CloudSetup;
  config: ClientConfigType;
  connectorTypes?: ConnectorDefinition[];
  console?: ConsolePluginStart;
  coreSecurity?: SecurityServiceStart;
  data?: DataPublicPluginStart;
  esConfig: ESConfig;
  getChromeStyle$: ChromeStart['getChromeStyle$'];
  guidedOnboarding?: GuidedOnboardingPluginStart;
  history: ScopedHistory;
  indexMappingComponent?: React.FC<IndexMappingProps>;
  isSearchHomepageEnabled: boolean;
  isSidebarEnabled: boolean;
  lens?: LensPublicStart;
  ml?: MlPluginStart;
  navigateToUrl: RequiredFieldsOnly<ApplicationStart['navigateToUrl']>;
  productAccess: ProductAccess;
  productFeatures: ProductFeatures;
  renderHeaderActions(HeaderActions?: FC): void;
  searchHomepage?: SearchHomepagePluginStart;
  searchPlayground?: SearchPlaygroundPluginStart;
  searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
  security?: SecurityPluginStart;
  setBreadcrumbs(crumbs: ChromeBreadcrumb[]): void;
  setChromeIsVisible(isVisible: boolean): void;
  setDocTitle(title: string): void;
  share?: SharePluginStart;
  uiSettings?: IUiSettingsClient;
  updateSideNavDefinition: UpdateSideNavDefinitionFn;
}

export interface KibanaValues {
  application: ApplicationStart;
  capabilities: Capabilities;
  charts: ChartsPluginStart | null;
  cloud: CloudSetup | null;
  config: ClientConfigType;
  connectorTypes: ConnectorDefinition[];
  consolePlugin: ConsolePluginStart | null;
  data: DataPublicPluginStart | null;
  esConfig: ESConfig;
  getChromeStyle$: ChromeStart['getChromeStyle$'];
  guidedOnboarding: GuidedOnboardingPluginStart | null;
  history: ScopedHistory;
  indexMappingComponent: React.FC<IndexMappingProps> | null;
  isCloud: boolean;
  isSearchHomepageEnabled: boolean;
  isSidebarEnabled: boolean;
  lens: LensPublicStart | null;
  ml: MlPluginStart | null;
  navigateToUrl(path: string, options?: CreateHrefOptions): Promise<void>;
  productAccess: ProductAccess;
  productFeatures: ProductFeatures;
  renderHeaderActions(HeaderActions?: FC): void;
  searchHomepage: SearchHomepagePluginStart | null;
  searchPlayground: SearchPlaygroundPluginStart | null;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | null;
  security: SecurityPluginStart | null;
  setBreadcrumbs(crumbs: ChromeBreadcrumb[]): void;
  setChromeIsVisible(isVisible: boolean): void;
  setDocTitle(title: string): void;
  share: SharePluginStart | null;
  uiSettings: IUiSettingsClient | null;
  updateSideNavDefinition: UpdateSideNavDefinitionFn;
  user: AuthenticatedUser | null;
}

export const KibanaLogic = kea<MakeLogicType<KibanaValues>>({
  actions: {
    setUser: (user: AuthenticatedUser | null) => ({ user }),
  },
  path: ['enterprise_search', 'kibana_logic'],
  reducers: ({ props }) => ({
    application: [props.application, {}],
    capabilities: [props.capabilities, {}],
    charts: [props.charts || null, {}],
    cloud: [props.cloud || null, {}],
    config: [props.config || null, {}],
    connectorTypes: [props.connectorTypes || [], {}],
    consolePlugin: [props.console || null, {}],
    data: [props.data || null, {}],
    esConfig: [props.esConfig || { elasticsearch_host: ELASTICSEARCH_URL_PLACEHOLDER }, {}],
    getChromeStyle$: [props.getChromeStyle$, {}],
    guidedOnboarding: [props.guidedOnboarding || null, {}],
    history: [props.history, {}],
    indexMappingComponent: [props.indexMappingComponent || null, {}],
    isSearchHomepageEnabled: [props.isSearchHomepageEnabled, {}],
    isSidebarEnabled: [props.isSidebarEnabled, {}],
    lens: [props.lens || null, {}],
    ml: [props.ml || null, {}],
    navigateToUrl: [
      (url: string, options?: CreateHrefOptions) => {
        const deps = { history: props.history, http: HttpLogic.values.http };
        const href = createHref(url, deps, options);
        return props.navigateToUrl(href);
      },
      {},
    ],
    productAccess: [props.productAccess, {}],
    productFeatures: [props.productFeatures, {}],
    renderHeaderActions: [props.renderHeaderActions, {}],
    searchHomepage: [props.searchHomepage || null, {}],
    searchPlayground: [props.searchPlayground || null, {}],
    searchInferenceEndpoints: [props.searchInferenceEndpoints || null, {}],
    security: [props.security || null, {}],
    setBreadcrumbs: [props.setBreadcrumbs, {}],
    setChromeIsVisible: [props.setChromeIsVisible, {}],
    setDocTitle: [props.setDocTitle, {}],
    share: [props.share || null, {}],
    uiSettings: [props.uiSettings, {}],
    updateSideNavDefinition: [props.updateSideNavDefinition, {}],
    user: [
      props.user || null,
      {
        setUser: (_, { user }) => user || null,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    isCloud: [() => [selectors.cloud], (cloud?: CloudSetup) => Boolean(cloud?.isCloudEnabled)],
  }),
});

export const mountKibanaLogic = (props: KibanaLogicProps) => {
  KibanaLogic(props);
  const unmount = KibanaLogic.mount();
  props.coreSecurity?.authc.getCurrentUser()?.then((user) => {
    KibanaLogic.actions.setUser(user);
  });
  return unmount;
};
