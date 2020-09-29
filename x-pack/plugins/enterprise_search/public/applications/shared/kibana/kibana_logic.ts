/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { ApplicationStart, ChromeBreadcrumb } from 'src/core/public';

export interface IKibanaValues {
  config: { host?: string };
  navigateToUrl: ApplicationStart['navigateToUrl'];
  setBreadcrumbs(crumbs: ChromeBreadcrumb[]): void;
  setDocTitle(title: string): void;
}

export const KibanaLogic = kea<MakeLogicType<IKibanaValues>>({
  path: ['enterprise_search', 'kibana_logic'],
  reducers: ({ props }) => ({
    config: [props.config || {}, {}],
    navigateToUrl: [props.navigateToUrl, {}],
    setBreadcrumbs: [props.setBreadcrumbs, {}],
    setDocTitle: [props.setDocTitle, {}],
  }),
});

export const mountKibanaLogic = (props: IKibanaValues) => {
  KibanaLogic(props);
  const unmount = KibanaLogic.mount();
  return unmount;
};
