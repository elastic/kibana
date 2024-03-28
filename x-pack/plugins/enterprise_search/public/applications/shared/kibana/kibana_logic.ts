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
} from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';

import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { MlPluginStart } from '@kbn/ml-plugin/public';
import { ELASTICSEARCH_URL_PLACEHOLDER } from '@kbn/search-api-panels/constants';
import { SearchPlaygroundPluginStart } from '@kbn/search-playground/public';
import { AuthenticatedUser, SecurityPluginStart } from '@kbn/security-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';

import { ClientConfigType, ProductAccess, ProductFeatures } from '../../../../common/types';
import { ESConfig } from '../../../plugin';

import { HttpLogic } from '../http';
import { createHref, CreateHrefOptions } from '../react_router_helpers';

type RequiredFieldsOnly<T> = {
  [K in keyof T as T[K] extends Required<T>[K] ? K : never]: T[K];
};
export interface KibanaLogicProps {
  application: ApplicationStart;
  capabilities: Capabilities;
  charts: ChartsPluginStart;
  cloud?: CloudSetup;
  config: ClientConfigType;
  console?: ConsolePluginStart;
  data: DataPublicPluginStart;
  esConfig: ESConfig;
  guidedOnboarding?: GuidedOnboardingPluginStart;
  history: ScopedHistory;
  isSidebarEnabled: boolean;
  lens: LensPublicStart;
  ml: MlPluginStart;
  navigateToUrl: RequiredFieldsOnly<ApplicationStart['navigateToUrl']>;
  productAccess: ProductAccess;
  productFeatures: ProductFeatures;
  renderHeaderActions(HeaderActions?: FC): void;
  searchPlayground: SearchPlaygroundPluginStart;
  security: SecurityPluginStart;
  setBreadcrumbs(crumbs: ChromeBreadcrumb[]): void;
  setChromeIsVisible(isVisible: boolean): void;
  setDocTitle(title: string): void;
  share: SharePluginStart;
  uiSettings: IUiSettingsClient;
  user: AuthenticatedUser | null;
}

export interface KibanaValues extends Omit<KibanaLogicProps, 'cloud' | 'console'> {
  cloud: Partial<CloudSetup>;
  consolePlugin: Partial<ConsolePluginStart>;
  data: DataPublicPluginStart;
  isCloud: boolean;
  lens: LensPublicStart;
  navigateToUrl(path: string, options?: CreateHrefOptions): Promise<void>;
}

export const KibanaLogic = kea<MakeLogicType<KibanaValues>>({
  path: ['enterprise_search', 'kibana_logic'],
  reducers: ({ props }) => ({
    application: [props.application || {}, {}],
    capabilities: [props.capabilities || {}, {}],
    charts: [props.charts, {}],
    cloud: [props.cloud || {}, {}],
    config: [props.config || {}, {}],
    consolePlugin: [props.console || {}, {}],
    data: [props.data, {}],
    esConfig: [props.esConfig || { elasticsearch_host: ELASTICSEARCH_URL_PLACEHOLDER }, {}],
    guidedOnboarding: [props.guidedOnboarding, {}],
    history: [props.history, {}],
    isSidebarEnabled: [props.isSidebarEnabled, {}],
    lens: [props.lens, {}],
    ml: [props.ml, {}],
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
    searchPlayground: [props.searchPlayground || {}, {}],
    security: [props.security, {}],
    setBreadcrumbs: [props.setBreadcrumbs, {}],
    setChromeIsVisible: [props.setChromeIsVisible, {}],
    setDocTitle: [props.setDocTitle, {}],
    share: [props.share, {}],
    uiSettings: [props.uiSettings, {}],
    user: [props.user, {}],
  }),
  selectors: ({ selectors }) => ({
    isCloud: [() => [selectors.cloud], (cloud?: Partial<CloudSetup>) => !!cloud?.isCloudEnabled],
  }),
});

export const mountKibanaLogic = (props: KibanaLogicProps) => {
  KibanaLogic(props);
  const unmount = KibanaLogic.mount();
  return unmount;
};
