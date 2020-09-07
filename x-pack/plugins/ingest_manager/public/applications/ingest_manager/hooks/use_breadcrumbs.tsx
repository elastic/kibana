/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb } from 'src/core/public';
import { BASE_PATH, Page, DynamicPagePathValues, pagePathGetters } from '../constants';
import { useCore } from './use_core';

const BASE_BREADCRUMB: ChromeBreadcrumb = {
  href: pagePathGetters.overview(),
  text: i18n.translate('xpack.ingestManager.breadcrumbs.appTitle', {
    defaultMessage: 'Ingest Manager',
  }),
};

const breadcrumbGetters: {
  [key in Page]: (values: DynamicPagePathValues) => ChromeBreadcrumb[];
} = {
  overview: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.ingestManager.breadcrumbs.overviewPageTitle', {
        defaultMessage: 'Overview',
      }),
    },
  ],
  integrations: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.ingestManager.breadcrumbs.integrationsPageTitle', {
        defaultMessage: 'Integrations',
      }),
    },
  ],
  integrations_all: () => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.integrations(),
      text: i18n.translate('xpack.ingestManager.breadcrumbs.integrationsPageTitle', {
        defaultMessage: 'Integrations',
      }),
    },
    {
      text: i18n.translate('xpack.ingestManager.breadcrumbs.allIntegrationsPageTitle', {
        defaultMessage: 'All',
      }),
    },
  ],
  integrations_installed: () => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.integrations(),
      text: i18n.translate('xpack.ingestManager.breadcrumbs.integrationsPageTitle', {
        defaultMessage: 'Integrations',
      }),
    },
    {
      text: i18n.translate('xpack.ingestManager.breadcrumbs.installedIntegrationsPageTitle', {
        defaultMessage: 'Installed',
      }),
    },
  ],
  integration_details: ({ pkgTitle }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.integrations(),
      text: i18n.translate('xpack.ingestManager.breadcrumbs.integrationsPageTitle', {
        defaultMessage: 'Integrations',
      }),
    },
    { text: pkgTitle },
  ],
  policies: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.ingestManager.breadcrumbs.policiesPageTitle', {
        defaultMessage: 'Policies',
      }),
    },
  ],
  policies_list: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.ingestManager.breadcrumbs.policiesPageTitle', {
        defaultMessage: 'Policies',
      }),
    },
  ],
  policy_details: ({ policyName }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.policies(),
      text: i18n.translate('xpack.ingestManager.breadcrumbs.policiesPageTitle', {
        defaultMessage: 'Policies',
      }),
    },
    { text: policyName },
  ],
  add_integration_from_policy: ({ policyName, policyId }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.policies(),
      text: i18n.translate('xpack.ingestManager.breadcrumbs.policiesPageTitle', {
        defaultMessage: 'Policies',
      }),
    },
    {
      href: pagePathGetters.policy_details({ policyId }),
      text: policyName,
    },
    {
      text: i18n.translate('xpack.ingestManager.breadcrumbs.addPackagePolicyPageTitle', {
        defaultMessage: 'Add integration',
      }),
    },
  ],
  add_integration_to_policy: ({ pkgTitle, pkgkey }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.integrations(),
      text: i18n.translate('xpack.ingestManager.breadcrumbs.integrationsPageTitle', {
        defaultMessage: 'Integrations',
      }),
    },
    {
      href: pagePathGetters.integration_details({ pkgkey }),
      text: pkgTitle,
    },
    {
      text: i18n.translate('xpack.ingestManager.breadcrumbs.addPackagePolicyPageTitle', {
        defaultMessage: 'Add integration',
      }),
    },
  ],
  edit_integration: ({ policyName, policyId }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.policies(),
      text: i18n.translate('xpack.ingestManager.breadcrumbs.policiesPageTitle', {
        defaultMessage: 'Policies',
      }),
    },
    {
      href: pagePathGetters.policy_details({ policyId }),
      text: policyName,
    },
    {
      text: i18n.translate('xpack.ingestManager.breadcrumbs.editPackagePolicyPageTitle', {
        defaultMessage: 'Edit integration',
      }),
    },
  ],
  fleet: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.ingestManager.breadcrumbs.fleetPageTitle', {
        defaultMessage: 'Fleet',
      }),
    },
  ],
  fleet_agent_list: () => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.fleet(),
      text: i18n.translate('xpack.ingestManager.breadcrumbs.fleetPageTitle', {
        defaultMessage: 'Fleet',
      }),
    },
    {
      text: i18n.translate('xpack.ingestManager.breadcrumbs.fleetAgentsPageTitle', {
        defaultMessage: 'Agents',
      }),
    },
  ],
  fleet_agent_details: ({ agentHost }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.fleet(),
      text: i18n.translate('xpack.ingestManager.breadcrumbs.fleetPageTitle', {
        defaultMessage: 'Fleet',
      }),
    },
    {
      text: i18n.translate('xpack.ingestManager.breadcrumbs.fleetAgentsPageTitle', {
        defaultMessage: 'Agents',
      }),
    },
    { text: agentHost },
  ],
  fleet_enrollment_tokens: () => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.fleet(),
      text: i18n.translate('xpack.ingestManager.breadcrumbs.fleetPageTitle', {
        defaultMessage: 'Fleet',
      }),
    },
    {
      text: i18n.translate('xpack.ingestManager.breadcrumbs.fleetEnrollmentTokensPageTitle', {
        defaultMessage: 'Enrollment tokens',
      }),
    },
  ],
  data_streams: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.ingestManager.breadcrumbs.datastreamsPageTitle', {
        defaultMessage: 'Data streams',
      }),
    },
  ],
};

export function useBreadcrumbs(page: Page, values: DynamicPagePathValues = {}) {
  const { chrome, http } = useCore();
  const breadcrumbs: ChromeBreadcrumb[] = breadcrumbGetters[page](values).map((breadcrumb) => ({
    ...breadcrumb,
    href: breadcrumb.href ? http.basePath.prepend(`${BASE_PATH}#${breadcrumb.href}`) : undefined,
  }));
  const docTitle: string[] = [...breadcrumbs]
    .reverse()
    .map((breadcrumb) => breadcrumb.text as string);
  chrome.docTitle.change(docTitle);
  chrome.setBreadcrumbs(breadcrumbs);
}
