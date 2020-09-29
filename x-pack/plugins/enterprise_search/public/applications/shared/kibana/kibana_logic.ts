/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { History } from 'history';
import { ApplicationStart, ChromeBreadcrumb } from 'src/core/public';

import { createHref, ICreateHrefOptions } from '../react_router_helpers';

interface IKibanaLogicProps {
  config: { host?: string };
  history: History;
  navigateToUrl: ApplicationStart['navigateToUrl'];
  setBreadcrumbs(crumbs: ChromeBreadcrumb[]): void;
  setDocTitle(title: string): void;
}
export interface IKibanaValues extends IKibanaLogicProps {
  navigateToUrl(path: string, options?: ICreateHrefOptions): Promise<void>;
}

export const KibanaLogic = kea<MakeLogicType<IKibanaValues>>({
  path: ['enterprise_search', 'kibana_logic'],
  reducers: ({ props }) => ({
    config: [props.config || {}, {}],
    history: [props.history, {}],
    navigateToUrl: [
      (url: string, options?: ICreateHrefOptions) => {
        const href = createHref(url, props.history, options);
        return props.navigateToUrl(href);
      },
      {},
    ],
    setBreadcrumbs: [props.setBreadcrumbs, {}],
    setDocTitle: [props.setDocTitle, {}],
  }),
});

export const mountKibanaLogic = (props: IKibanaLogicProps) => {
  KibanaLogic(props);
  const unmount = KibanaLogic.mount();
  return unmount;
};
