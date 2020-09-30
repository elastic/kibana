/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useValues } from 'kea';
import { EuiBreadcrumb } from '@elastic/eui';

import { KibanaLogic } from '../../shared/kibana';

import {
  ENTERPRISE_SEARCH_PLUGIN,
  APP_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../../../../common/constants';

import { letBrowserHandleEvent, createHref } from '../react_router_helpers';

/**
 * Generate React-Router-friendly EUI breadcrumb objects
 * https://elastic.github.io/eui/#/navigation/breadcrumbs
 */

interface IBreadcrumb {
  text: string;
  path?: string;
  // Used to navigate outside of the React Router basename,
  // i.e. if we need to go from App Search to Enterprise Search
  shouldNotCreateHref?: boolean;
}
export type TBreadcrumbs = IBreadcrumb[];

export const useBreadcrumbs = (breadcrumbs: TBreadcrumbs) => {
  const { navigateToUrl, history } = useValues(KibanaLogic);

  return breadcrumbs.map(({ text, path, shouldNotCreateHref }) => {
    const breadcrumb = { text } as EuiBreadcrumb;

    if (path) {
      breadcrumb.href = createHref(path, history, { shouldNotCreateHref });
      breadcrumb.onClick = (event) => {
        if (letBrowserHandleEvent(event)) return;
        event.preventDefault();
        navigateToUrl(path, { shouldNotCreateHref });
      };
    }

    return breadcrumb;
  });
};

/**
 * Product-specific breadcrumb helpers
 */

export const useEnterpriseSearchBreadcrumbs = (breadcrumbs: TBreadcrumbs = []) =>
  useBreadcrumbs([
    {
      text: ENTERPRISE_SEARCH_PLUGIN.NAME,
      path: ENTERPRISE_SEARCH_PLUGIN.URL,
      shouldNotCreateHref: true,
    },
    ...breadcrumbs,
  ]);

export const useAppSearchBreadcrumbs = (breadcrumbs: TBreadcrumbs = []) =>
  useEnterpriseSearchBreadcrumbs([{ text: APP_SEARCH_PLUGIN.NAME, path: '/' }, ...breadcrumbs]);

export const useWorkplaceSearchBreadcrumbs = (breadcrumbs: TBreadcrumbs = []) =>
  useEnterpriseSearchBreadcrumbs([
    { text: WORKPLACE_SEARCH_PLUGIN.NAME, path: '/' },
    ...breadcrumbs,
  ]);
