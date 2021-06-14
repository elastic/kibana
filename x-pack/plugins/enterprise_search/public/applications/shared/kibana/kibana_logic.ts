/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FC } from 'react';

import { History } from 'history';
import { kea, MakeLogicType } from 'kea';

import { ApplicationStart, ChromeBreadcrumb } from '../../../../../../../src/core/public';
import { ChartsPluginStart } from '../../../../../../../src/plugins/charts/public';
import { CloudSetup } from '../../../../../cloud/public';
import { SecurityPluginStart } from '../../../../../security/public';

import { HttpLogic } from '../http';
import { createHref, CreateHrefOptions } from '../react_router_helpers';

interface KibanaLogicProps {
  config: { host?: string };
  history: History;
  cloud: Partial<CloudSetup>;
  charts: ChartsPluginStart;
  navigateToUrl: ApplicationStart['navigateToUrl'];
  security: Partial<SecurityPluginStart>;
  setBreadcrumbs(crumbs: ChromeBreadcrumb[]): void;
  setChromeIsVisible(isVisible: boolean): void;
  setDocTitle(title: string): void;
  renderHeaderActions(HeaderActions: FC): void;
}
export interface KibanaValues extends KibanaLogicProps {
  navigateToUrl(path: string, options?: CreateHrefOptions): Promise<void>;
}

export const KibanaLogic = kea<MakeLogicType<KibanaValues>>({
  path: ['enterprise_search', 'kibana_logic'],
  reducers: ({ props }) => ({
    config: [props.config || {}, {}],
    charts: [props.charts, {}],
    cloud: [props.cloud || {}, {}],
    history: [props.history, {}],
    navigateToUrl: [
      (url: string, options?: CreateHrefOptions) => {
        const deps = { history: props.history, http: HttpLogic.values.http };
        const href = createHref(url, deps, options);
        return props.navigateToUrl(href);
      },
      {},
    ],
    security: [props.security || {}, {}],
    setBreadcrumbs: [props.setBreadcrumbs, {}],
    setChromeIsVisible: [props.setChromeIsVisible, {}],
    setDocTitle: [props.setDocTitle, {}],
    renderHeaderActions: [props.renderHeaderActions, {}],
  }),
});

export const mountKibanaLogic = (props: KibanaLogicProps) => {
  KibanaLogic(props);
  const unmount = KibanaLogic.mount();
  return unmount;
};
