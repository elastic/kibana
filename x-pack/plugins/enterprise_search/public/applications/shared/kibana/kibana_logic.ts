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
import { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import { SecurityPluginStart } from '@kbn/security-plugin/public';

import { ProductAccess } from '../../../../common/types';

import { HttpLogic } from '../http';
import { createHref, CreateHrefOptions } from '../react_router_helpers';

type RequiredFieldsOnly<T> = {
  [K in keyof T as T[K] extends Required<T>[K] ? K : never]: T[K];
};
interface KibanaLogicProps {
  config: { host?: string };
  productAccess: ProductAccess;
  // Kibana core
  capabilities: Capabilities;
  history: ScopedHistory;
  navigateToUrl: RequiredFieldsOnly<ApplicationStart['navigateToUrl']>;
  setBreadcrumbs(crumbs: ChromeBreadcrumb[]): void;
  setChromeIsVisible(isVisible: boolean): void;
  setDocTitle(title: string): void;
  renderHeaderActions(HeaderActions: FC): void;
  // Required plugins
  charts: ChartsPluginStart;
  guidedOnboarding: GuidedOnboardingPluginStart;
  security: SecurityPluginStart;
  uiSettings: IUiSettingsClient;
  // Optional plugins
  cloud?: CloudSetup;
}
export interface KibanaValues extends Omit<KibanaLogicProps, 'cloud'> {
  cloud: Partial<CloudSetup>;
  isCloud: boolean;
  navigateToUrl(path: string, options?: CreateHrefOptions): Promise<void>;
}

export const KibanaLogic = kea<MakeLogicType<KibanaValues>>({
  path: ['enterprise_search', 'kibana_logic'],
  reducers: ({ props }) => ({
    capabilities: [props.capabilities || {}, {}],
    config: [props.config || {}, {}],
    charts: [props.charts, {}],
    cloud: [props.cloud || {}, {}],
    guidedOnboarding: [props.guidedOnboarding, {}],
    history: [props.history, {}],
    navigateToUrl: [
      (url: string, options?: CreateHrefOptions) => {
        const deps = { history: props.history, http: HttpLogic.values.http };
        const href = createHref(url, deps, options);
        return props.navigateToUrl(href);
      },
      {},
    ],
    productAccess: [props.productAccess, {}],
    renderHeaderActions: [props.renderHeaderActions, {}],
    security: [props.security, {}],
    setBreadcrumbs: [props.setBreadcrumbs, {}],
    setChromeIsVisible: [props.setChromeIsVisible, {}],
    setDocTitle: [props.setDocTitle, {}],
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
