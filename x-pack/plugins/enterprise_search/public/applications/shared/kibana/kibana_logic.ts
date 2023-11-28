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
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import { SharePluginStart } from '@kbn/share-plugin/public';

import { ClientConfigType, ProductAccess, ProductFeatures } from '../../../../common/types';

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
  data: DataPublicPluginStart;
  guidedOnboarding?: GuidedOnboardingPluginStart;
  history: ScopedHistory;
  isSidebarEnabled: boolean;
  lens: LensPublicStart;
  navigateToUrl: RequiredFieldsOnly<ApplicationStart['navigateToUrl']>;
  productAccess: ProductAccess;
  productFeatures: ProductFeatures;
  renderHeaderActions(HeaderActions?: FC): void;
  security: SecurityPluginStart;
  setBreadcrumbs(crumbs: ChromeBreadcrumb[]): void;
  setChromeIsVisible(isVisible: boolean): void;
  setDocTitle(title: string): void;
  share: SharePluginStart;
  ml: MlPluginStart;
  uiSettings: IUiSettingsClient;
}

export interface KibanaValues extends Omit<KibanaLogicProps, 'cloud'> {
  cloud: Partial<CloudSetup>;
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
    data: [props.data, {}],
    guidedOnboarding: [props.guidedOnboarding, {}],
    history: [props.history, {}],
    isSidebarEnabled: [props.isSidebarEnabled, {}],
    lens: [props.lens, {}],
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
    security: [props.security, {}],
    setBreadcrumbs: [props.setBreadcrumbs, {}],
    setChromeIsVisible: [props.setChromeIsVisible, {}],
    setDocTitle: [props.setDocTitle, {}],
    share: [props.share, {}],
    ml: [props.ml, {}],
    uiSettings: [props.uiSettings, {}],
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
