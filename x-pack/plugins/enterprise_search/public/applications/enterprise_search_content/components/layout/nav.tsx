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
  WORKPLACE_SEARCH_PLUGIN,
} from '../../../../../common/constants';
import { generateNavLink } from '../../../shared/layout';

import { ROOT_PATH, SEARCH_INDICIES_PATH, SETTINGS_PATH } from '../../routes';

import { useSearchIndicesNav } from '../search_index/index_nav';

export const useEnterpriseSearchContentNav = () => {
  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      id: 'es_overview',
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
        to: ROOT_PATH,
        isRoot: true,
        shouldShowActiveForSubroutes: false,
        items: [
          {
            id: 'search_indicies',
            name: i18n.translate('xpack.enterpriseSearch.content.nav.searchIndiciesTitle', {
              defaultMessage: 'Search indicies',
            }),
            ...generateNavLink({
              to: SEARCH_INDICIES_PATH,
              isRoot: true,
              shouldShowActiveForSubroutes: true,
              items: useSearchIndicesNav(),
            }),
          },
          {
            id: 'search_indicies',
            name: i18n.translate('xpack.enterpriseSearch.content.nav.settingsTitle', {
              defaultMessage: 'Settings',
            }),
            ...generateNavLink({
              to: SETTINGS_PATH,
              isRoot: true,
            }),
          },
        ],
      }),
    },
    {
      id: 'app_search',
      emphasize: true,
      name: i18n.translate('xpack.enterpriseSearch.content.nav.appSearchTitle', {
        defaultMessage: 'App Search',
      }),
      href: APP_SEARCH_PLUGIN.URL,
    },
    {
      id: 'workplace_search',
      emphasize: true,
      name: i18n.translate('xpack.enterpriseSearch.content.nav.workplaceSearchTitle', {
        defaultMessage: 'Workplace Search',
      }),
      href: WORKPLACE_SEARCH_PLUGIN.URL,
    },
  ];

  // Root level items are meant to be section headers, but the AS nav (currently)
  // isn't organized this way. So we create a fake empty parent item here
  // to cause all our navItems to properly render as nav links.
  // return [{ id: '', name: '', items: navItems }];
  return navItems;
};
