/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from 'src/core/public';

import type { Page, DynamicPagePathValues } from '../constants';
import { FLEET_BASE_PATH, pagePathGetters } from '../constants';

import { useStartServices } from './';

const BASE_BREADCRUMB: ChromeBreadcrumb = {
  href: pagePathGetters.overview()[1],
  text: i18n.translate('xpack.fleet.breadcrumbs.appTitle', {
    defaultMessage: 'Fleet',
  }),
};

const breadcrumbGetters: {
  [key in Page]?: (values: DynamicPagePathValues) => ChromeBreadcrumb[];
} = {
  base: () => [BASE_BREADCRUMB],
  overview: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.overviewPageTitle', {
        defaultMessage: 'Overview',
      }),
    },
  ],

  policies: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.policiesPageTitle', {
        defaultMessage: 'Policies',
      }),
    },
  ],
  policies_list: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.policiesPageTitle', {
        defaultMessage: 'Policies',
      }),
    },
  ],
  policy_details: ({ policyName }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.policies()[1],
      text: i18n.translate('xpack.fleet.breadcrumbs.policiesPageTitle', {
        defaultMessage: 'Policies',
      }),
    },
    { text: policyName },
  ],
  fleet: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.agentsPageTitle', {
        defaultMessage: 'Agents',
      }),
    },
  ],
  fleet_agent_list: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.agentsPageTitle', {
        defaultMessage: 'Agents',
      }),
    },
  ],
  fleet_agent_details: ({ agentHost }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.fleet()[1],
      text: i18n.translate('xpack.fleet.breadcrumbs.agentsPageTitle', {
        defaultMessage: 'Agents',
      }),
    },
    { text: agentHost },
  ],
  fleet_enrollment_tokens: () => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.fleet()[1],
      text: i18n.translate('xpack.fleet.breadcrumbs.agentsPageTitle', {
        defaultMessage: 'Agents',
      }),
    },
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.enrollmentTokensPageTitle', {
        defaultMessage: 'Enrollment tokens',
      }),
    },
  ],
  data_streams: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.datastreamsPageTitle', {
        defaultMessage: 'Data streams',
      }),
    },
  ],
};

export function useBreadcrumbs(page: Page, values: DynamicPagePathValues = {}) {
  const { chrome, http } = useStartServices();
  const breadcrumbs: ChromeBreadcrumb[] =
    breadcrumbGetters[page]?.(values).map((breadcrumb) => ({
      ...breadcrumb,
      href: breadcrumb.href
        ? http.basePath.prepend(`${FLEET_BASE_PATH}#${breadcrumb.href}`)
        : undefined,
    })) || [];
  const docTitle: string[] = [...breadcrumbs]
    .reverse()
    .map((breadcrumb) => breadcrumb.text as string);
  chrome.docTitle.change(docTitle);
  chrome.setBreadcrumbs(breadcrumbs);
}
