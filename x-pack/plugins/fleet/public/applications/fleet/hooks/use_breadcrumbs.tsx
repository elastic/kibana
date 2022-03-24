/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from 'src/core/public';

import type { Page, DynamicPagePathValues } from '../constants';
import { FLEET_BASE_PATH, INTEGRATIONS_BASE_PATH, pagePathGetters } from '../constants';

import { useStartServices } from './';

interface AdditionalBreadcrumbOptions {
  useIntegrationsBasePath: boolean;
}

type Breadcrumb = ChromeBreadcrumb & Partial<AdditionalBreadcrumbOptions>;

const BASE_BREADCRUMB: Breadcrumb = {
  href: pagePathGetters.base()[1],
  text: i18n.translate('xpack.fleet.breadcrumbs.appTitle', {
    defaultMessage: 'Fleet',
  }),
};

const INTEGRATIONS_BASE_BREADCRUMB: Breadcrumb = {
  href: pagePathGetters.integrations()[1],
  text: i18n.translate('xpack.fleet.breadcrumbs.integrationsAppTitle', {
    defaultMessage: 'Integrations',
  }),
  useIntegrationsBasePath: true,
};

const breadcrumbGetters: {
  [key in Page]?: (values: DynamicPagePathValues) => Breadcrumb[];
} = {
  base: () => [BASE_BREADCRUMB],
  policies: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.policiesPageTitle', {
        defaultMessage: 'Agent policies',
      }),
    },
  ],
  policies_list: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.policiesPageTitle', {
        defaultMessage: 'Agent policies',
      }),
    },
  ],
  policy_details: ({ policyName }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.policies()[1],
      text: i18n.translate('xpack.fleet.breadcrumbs.policiesPageTitle', {
        defaultMessage: 'Agent policies',
      }),
    },
    { text: policyName },
  ],
  add_integration_to_policy: ({ pkgTitle, pkgkey, integration }) => [
    INTEGRATIONS_BASE_BREADCRUMB,
    {
      href: pagePathGetters.integration_details_overview({ pkgkey, integration })[1],
      text: pkgTitle,
      useIntegrationsBasePath: true,
    },
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.addPackagePolicyPageTitle', {
        defaultMessage: 'Add integration',
      }),
    },
  ],
  edit_integration: ({ policyName, policyId }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.policies()[1],
      text: i18n.translate('xpack.fleet.breadcrumbs.policiesPageTitle', {
        defaultMessage: 'Agent policies',
      }),
    },
    {
      href: pagePathGetters.policy_details({ policyId })[1],
      text: policyName,
    },
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.editPackagePolicyPageTitle', {
        defaultMessage: 'Edit integration',
      }),
    },
  ],
  upgrade_package_policy: ({ policyName, policyId }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.policies()[1],
      text: i18n.translate('xpack.fleet.breadcrumbs.policiesPageTitle', {
        defaultMessage: 'Agent policies',
      }),
    },
    {
      href: pagePathGetters.policy_details({ policyId })[1],
      text: policyName,
    },
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.upgradePackagePolicyPageTitle', {
        defaultMessage: 'Upgrade integration ',
      }),
    },
  ],
  agent_list: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.agentsPageTitle', {
        defaultMessage: 'Agents',
      }),
    },
  ],
  agent_details: ({ agentHost }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.agent_list({})[1],
      text: i18n.translate('xpack.fleet.breadcrumbs.agentsPageTitle', {
        defaultMessage: 'Agents',
      }),
    },
    { text: agentHost },
  ],
  enrollment_tokens: () => [
    BASE_BREADCRUMB,
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
  settings: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.settingsPageTitle', {
        defaultMessage: 'Settings',
      }),
    },
  ],
};

export function useBreadcrumbs(page: Page, values: DynamicPagePathValues = {}) {
  const { chrome, http, application } = useStartServices();
  const breadcrumbs =
    breadcrumbGetters[page]?.(values).map((breadcrumb) => {
      const href = breadcrumb.href
        ? http.basePath.prepend(
            `${breadcrumb.useIntegrationsBasePath ? INTEGRATIONS_BASE_PATH : FLEET_BASE_PATH}${
              breadcrumb.href
            }`
          )
        : undefined;
      return {
        ...breadcrumb,
        href,
        onClick: href
          ? (ev: React.MouseEvent) => {
              if (ev.metaKey || ev.altKey || ev.ctrlKey || ev.shiftKey) {
                return;
              }
              ev.preventDefault();
              application.navigateToUrl(href);
            }
          : undefined,
      };
    }) || [];
  const docTitle: string[] = [...breadcrumbs]
    .reverse()
    .map((breadcrumb) => breadcrumb.text as string);
  chrome.docTitle.change(docTitle);
  chrome.setBreadcrumbs(breadcrumbs);
}
