/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSideNavItemType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  APP_SEARCH_PLUGIN,
  ENTERPRISE_SEARCH_OVERVIEW_PLUGIN,
  ENTERPRISE_SEARCH_CONTENT_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../../../../../common/constants';
import { generateNavLink } from '../../../shared/layout';

export const useEnterpriseSearchOverviewNav = () => {
  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      id: 'es_overview',
      isSelected: true,
      emphasize: true,
      name: i18n.translate('xpack.enterpriseSearch.content.nav.enterpriseSearchOverviewTitle', {
        defaultMessage: 'Overview',
      }),
      href: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.URL,
    },
    {
      id: 'content',
      emphasize: true,
      name: i18n.translate('xpack.enterpriseSearch.content.nav.contentTitle', {
        defaultMessage: 'Content',
      }),
      ...generateNavLink({
        to: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL,
        shouldNotCreateHref: true,
      }),
    },
    {
      id: 'app_search',
      emphasize: true,
      name: i18n.translate('xpack.enterpriseSearch.content.nav.appSearchTitle', {
        defaultMessage: 'App Search',
      }),
      ...generateNavLink({
        to: APP_SEARCH_PLUGIN.URL,
        shouldNotCreateHref: true,
      }),
    },
    {
      id: 'workplace_search',
      emphasize: true,
      name: i18n.translate('xpack.enterpriseSearch.content.nav.workplaceSearchTitle', {
        defaultMessage: 'Workplace Search',
      }),
      ...generateNavLink({
        to: WORKPLACE_SEARCH_PLUGIN.URL,
        shouldNotCreateHref: true,
      }),
    },
  ];

  return navItems;
};
