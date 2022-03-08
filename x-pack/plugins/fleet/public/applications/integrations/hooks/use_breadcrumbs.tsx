/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from 'src/core/public';

import type { Page, DynamicPagePathValues } from '../constants';
import { INTEGRATIONS_BASE_PATH, pagePathGetters } from '../constants';

import { useStartServices } from './index';

const BASE_BREADCRUMB: ChromeBreadcrumb = {
  href: pagePathGetters.integrations()[1],
  text: i18n.translate('xpack.fleet.breadcrumbs.integrationsAppTitle', {
    defaultMessage: 'Integrations',
  }),
};

const breadcrumbGetters: {
  [key in Page]?: (values: DynamicPagePathValues) => ChromeBreadcrumb[];
} = {
  integrations: () => [BASE_BREADCRUMB],
  integrations_all: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.allIntegrationsPageTitle', {
        defaultMessage: 'Browse integrations',
      }),
    },
  ],
  integrations_installed: () => [
    BASE_BREADCRUMB,
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.installedIntegrationsPageTitle', {
        defaultMessage: 'Installed integrations',
      }),
    },
  ],
  integration_details_overview: ({ pkgTitle }) => [BASE_BREADCRUMB, { text: pkgTitle }],
  integration_policy_edit: ({ pkgTitle, pkgkey, policyName }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.integration_details_policies({ pkgkey })[1],
      text: pkgTitle,
    },
    { text: policyName },
  ],
  integration_policy_upgrade: ({ pkgTitle, pkgkey, policyName }) => [
    BASE_BREADCRUMB,
    {
      href: pagePathGetters.integration_details_policies({ pkgkey })[1],
      text: pkgTitle,
    },
    { text: policyName },
    {
      text: i18n.translate('xpack.fleet.breadcrumbs.upgradePackagePolicyPageTitle', {
        defaultMessage: 'Upgrade integration ',
      }),
    },
  ],
};

export function useBreadcrumbs(page: Page, values: DynamicPagePathValues = {}) {
  const { chrome, http, application } = useStartServices();
  const pageRef = useRef<Page | undefined>();

  if (pageRef.current === page) {
    return;
  }

  pageRef.current = page;

  const breadcrumbs: ChromeBreadcrumb[] =
    breadcrumbGetters[page]?.(values).map((breadcrumb) => {
      const href = breadcrumb.href
        ? http.basePath.prepend(`${INTEGRATIONS_BASE_PATH}${breadcrumb.href}`)
        : undefined;
      return {
        ...breadcrumb,
        href,
        onClick: href
          ? (ev: React.MouseEvent) => {
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
