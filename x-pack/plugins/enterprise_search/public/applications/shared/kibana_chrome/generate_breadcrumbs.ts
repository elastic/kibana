/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useValues } from 'kea';

import { EuiBreadcrumb } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  ANALYTICS_PLUGIN,
  APP_SEARCH_PLUGIN,
  ENTERPRISE_SEARCH_CONTENT_PLUGIN,
  SEARCH_RELEVANCE_PLUGIN,
  ENTERPRISE_SEARCH_PRODUCT_NAME,
  AI_SEARCH_PLUGIN,
  SEARCH_EXPERIENCES_PLUGIN,
  SEARCH_PRODUCT_NAME,
  VECTOR_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
  SEMANTIC_SEARCH_PLUGIN,
  APPLICATIONS_PLUGIN,
  GETTING_STARTED_TITLE,
} from '../../../../common/constants';

import { stripLeadingSlash } from '../../../../common/strip_slashes';
import { HttpLogic } from '../http';
import { KibanaLogic } from '../kibana';
import { letBrowserHandleEvent, createHref } from '../react_router_helpers';

import { getHomeURL } from './breadcrumbs_home';

/**
 * Types
 */

export interface Breadcrumb {
  text: string;
  path?: string;
  // Used to navigate outside of the React Router basename,
  // i.e. if we need to go from App Search to Enterprise Search
  shouldNotCreateHref?: boolean;
}
export type Breadcrumbs = Breadcrumb[];
export type BreadcrumbTrail = string[]; // A trail of breadcrumb text

/**
 * Generate an array of breadcrumbs based on:
 * 1. A passed array of breadcrumb text (the trail prop)
 * 2. The current React Router path
 *
 * To correctly generate working breadcrumbs, ensure the trail array passed to
 * SetPageChrome matches up with the routed path. For example, a page with a trail of:
 *    `['Groups', 'Example Group Name', 'Source Prioritization']`
 * should have a router pathname of:
 *   `'/groups/{example-group-id}/source_prioritization'`
 *
 * Which should then generate the following breadcrumb output:
 * Groups (linked to `/groups`)
 * > Example Group Name (linked to `/groups/{example-group-id}`)
 * > Source Prioritization (linked to `/groups/{example-group-id}/source_prioritization`)
 */

export const useGenerateBreadcrumbs = (trail: BreadcrumbTrail): Breadcrumbs => {
  const { history } = useValues(KibanaLogic);
  const pathArray = stripLeadingSlash(history.location.pathname).split('/');

  return trail.map((text, i) => {
    const path = pathArray[i] ? '/' + pathArray.slice(0, i + 1).join('/') : undefined;
    return { text, path };
  });
};

/**
 * Convert IBreadcrumb objects to React-Router-friendly EUI breadcrumb objects
 * https://elastic.github.io/eui/#/navigation/breadcrumbs
 *
 * NOTE: Per EUI best practices, we remove the link behavior and
 * generate an inactive breadcrumb for the last breadcrumb in the list.
 */

export const useEuiBreadcrumbs = (breadcrumbs: Breadcrumbs): EuiBreadcrumb[] => {
  const { navigateToUrl, history } = useValues(KibanaLogic);
  const { http } = useValues(HttpLogic);

  return breadcrumbs.map(({ text, path, shouldNotCreateHref }, i) => {
    const breadcrumb: EuiBreadcrumb = { text };
    const isLastBreadcrumb = i === breadcrumbs.length - 1;

    if (path && !isLastBreadcrumb) {
      breadcrumb.href = createHref(path, { history, http }, { shouldNotCreateHref });
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

export const useSearchBreadcrumbs = (breadcrumbs: Breadcrumbs = []) =>
  useEuiBreadcrumbs([
    {
      text: SEARCH_PRODUCT_NAME,
      path: getHomeURL(),
      shouldNotCreateHref: true,
    },
    ...breadcrumbs,
  ]);

export const useEnterpriseSearchBreadcrumbs = (breadcrumbs: Breadcrumbs = []) =>
  useEuiBreadcrumbs([
    {
      text: ENTERPRISE_SEARCH_PRODUCT_NAME,
      path: getHomeURL(),
      shouldNotCreateHref: true,
    },
    ...breadcrumbs,
  ]);

export const useAnalyticsBreadcrumbs = (breadcrumbs: Breadcrumbs = []) =>
  useSearchBreadcrumbs([
    { text: APPLICATIONS_PLUGIN.NAV_TITLE },
    { text: ANALYTICS_PLUGIN.NAME, path: '/' },
    ...breadcrumbs,
  ]);

export const useElasticsearchBreadcrumbs = (breadcrumbs: Breadcrumbs = []) =>
  useSearchBreadcrumbs([
    {
      text: i18n.translate('xpack.enterpriseSearch.elasticsearch.breadcrumbs.title', {
        defaultMessage: 'Getting started with Elasticsearch',
      }),
      path: '/',
    },
    ...breadcrumbs,
  ]);

export const useAppSearchBreadcrumbs = (breadcrumbs: Breadcrumbs = []) =>
  useEnterpriseSearchBreadcrumbs([{ text: APP_SEARCH_PLUGIN.NAME, path: '/' }, ...breadcrumbs]);

export const useWorkplaceSearchBreadcrumbs = (breadcrumbs: Breadcrumbs = []) =>
  useEnterpriseSearchBreadcrumbs([
    { text: WORKPLACE_SEARCH_PLUGIN.NAME, path: '/' },
    ...breadcrumbs,
  ]);

export const useEnterpriseSearchContentBreadcrumbs = (breadcrumbs: Breadcrumbs = []) =>
  useSearchBreadcrumbs([
    { text: ENTERPRISE_SEARCH_CONTENT_PLUGIN.NAV_TITLE, path: '/' },
    ...breadcrumbs,
  ]);

export const useEnterpriseSearchRelevanceBreadcrumbs = (breadcrumbs: Breadcrumbs = []) =>
  useSearchBreadcrumbs([{ text: SEARCH_RELEVANCE_PLUGIN.NAV_TITLE, path: '/' }, ...breadcrumbs]);

export const useSearchExperiencesBreadcrumbs = (breadcrumbs: Breadcrumbs = []) =>
  useSearchBreadcrumbs([{ text: SEARCH_EXPERIENCES_PLUGIN.NAV_TITLE, path: '/' }, ...breadcrumbs]);

export const useEnterpriseSearchApplicationsBreadcrumbs = (breadcrumbs: Breadcrumbs = []) =>
  useSearchBreadcrumbs([{ text: APPLICATIONS_PLUGIN.NAV_TITLE }, ...breadcrumbs]);

export const useAiSearchBreadcrumbs = (breadcrumbs: Breadcrumbs = []) =>
  useSearchBreadcrumbs([
    { text: GETTING_STARTED_TITLE },
    { text: AI_SEARCH_PLUGIN.NAME, path: '/' },
    ...breadcrumbs,
  ]);

export const useVectorSearchBreadcrumbs = (breadcrumbs: Breadcrumbs = []) =>
  useSearchBreadcrumbs([
    { text: GETTING_STARTED_TITLE },
    { text: VECTOR_SEARCH_PLUGIN.NAV_TITLE, path: '/' },
    ...breadcrumbs,
  ]);

export const useSemanticSearchBreadcrumbs = (breadcrumbs: Breadcrumbs = []) =>
  useSearchBreadcrumbs([
    { text: GETTING_STARTED_TITLE },
    { text: SEMANTIC_SEARCH_PLUGIN.NAME, path: '/' },
    ...breadcrumbs,
  ]);
