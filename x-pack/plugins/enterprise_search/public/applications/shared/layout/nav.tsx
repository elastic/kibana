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
  ELASTICSEARCH_PLUGIN,
  ENTERPRISE_SEARCH_OVERVIEW_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../../../../common/constants';

import { SEARCH_INDICES_PATH } from '../routes';

import { generateNavLink } from './nav_link_helpers';

export const useEnterpriseSearchNav = () => {
  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      id: 'es_overview',
      name: i18n.translate('xpack.enterpriseSearch.nav.enterpriseSearchOverviewTitle', {
        defaultMessage: 'Overview',
      }),
      ...generateNavLink({
        to: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.URL,
        shouldNotCreateHref: true,
      }),
    },
    {
      id: 'content',
      emphasize: true,
      name: i18n.translate('xpack.enterpriseSearch.nav.contentTitle', {
        defaultMessage: 'Content',
      }),
      items: [
        {
          id: 'search_indices',
          name: i18n.translate('xpack.enterpriseSearch.nav.searchIndicesTitle', {
            defaultMessage: 'Indices',
          }),
          ...generateNavLink({
            to: SEARCH_INDICES_PATH,
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: true,
          }),
        },
      ],
    },
    {
      id: 'search_experiences',
      name: i18n.translate('xpack.enterpriseSearch.nav.searchExperiencesTitle', {
        defaultMessage: 'Search experiences',
      }),
      items: [
        {
          id: 'elasticsearch',
          name: i18n.translate('xpack.enterpriseSearch.nav.elasticsearchTitle', {
            defaultMessage: 'Elasticsearch',
          }),
          ...generateNavLink({
            to: ELASTICSEARCH_PLUGIN.URL,
            shouldNotCreateHref: true,
          }),
        },
        {
          id: 'app_search',
          name: i18n.translate('xpack.enterpriseSearch.nav.appSearchTitle', {
            defaultMessage: 'App Search',
          }),
          ...generateNavLink({
            to: APP_SEARCH_PLUGIN.URL,
            shouldNotCreateHref: true,
          }),
        },
        {
          id: 'workplace_search',
          name: i18n.translate('xpack.enterpriseSearch.nav.workplaceSearchTitle', {
            defaultMessage: 'Workplace Search',
          }),
          ...generateNavLink({
            to: WORKPLACE_SEARCH_PLUGIN.URL,
            shouldNotCreateHref: true,
          }),
        },
      ],
    },
  ];

  return navItems;
};
