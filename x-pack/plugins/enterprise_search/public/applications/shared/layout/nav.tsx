/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useValues } from 'kea';

import { EuiSideNavItemType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  ANALYTICS_PLUGIN,
  APP_SEARCH_PLUGIN,
  ELASTICSEARCH_PLUGIN,
  ENTERPRISE_SEARCH_CONTENT_PLUGIN,
  ENTERPRISE_SEARCH_OVERVIEW_PLUGIN,
  SEARCH_EXPERIENCES_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../../../../common/constants';
import { enableEnginesSection } from '../../../../common/ui_settings_keys';
import {
  ENGINES_PATH,
  SEARCH_INDICES_PATH,
  SETTINGS_PATH,
} from '../../enterprise_search_content/routes';
import { KibanaLogic } from '../kibana';

import { generateNavLink } from './nav_link_helpers';

export const useEnterpriseSearchNav = () => {
  const { productAccess, uiSettings } = useValues(KibanaLogic);

  const enginesSectionEnabled = uiSettings?.get<boolean>(enableEnginesSection, false);

  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      id: 'es_overview',
      name: i18n.translate('xpack.enterpriseSearch.nav.enterpriseSearchOverviewTitle', {
        defaultMessage: 'Overview',
      }),
      ...generateNavLink({
        shouldNotCreateHref: true,
        to: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.URL,
      }),
    },
    {
      id: 'content',
      items: [
        {
          id: 'search_indices',
          name: i18n.translate('xpack.enterpriseSearch.nav.searchIndicesTitle', {
            defaultMessage: 'Indices',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: true,
            to: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + SEARCH_INDICES_PATH,
          }),
        },
        {
          id: 'settings',
          name: i18n.translate('xpack.enterpriseSearch.nav.contentSettingsTitle', {
            defaultMessage: 'Settings',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: true,
            to: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + SETTINGS_PATH,
          }),
        },
      ],
      name: i18n.translate('xpack.enterpriseSearch.nav.contentTitle', {
        defaultMessage: 'Content',
      }),
    },
    ...(enginesSectionEnabled
      ? [
          {
            id: 'enterpriseSearchEngines',
            name: i18n.translate('xpack.enterpriseSearch.nav.enginesTitle', {
              defaultMessage: 'Engines',
            }),
            ...generateNavLink({
              shouldNotCreateHref: true,
              shouldShowActiveForSubroutes: true,
              to: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + ENGINES_PATH,
            }),
          },
        ]
      : []),
    {
      id: 'enterpriseSearchAnalytics',
      items: [
        {
          id: 'analytics_collections',
          name: i18n.translate('xpack.enterpriseSearch.nav.analyticsCollectionsTitle', {
            defaultMessage: 'Collections',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: true,
            to: ANALYTICS_PLUGIN.URL,
          }),
        },
      ],
      name: i18n.translate('xpack.enterpriseSearch.nav.analyticsTitle', {
        defaultMessage: 'Analytics',
      }),
    },
    {
      id: 'search',
      items: [
        {
          id: 'elasticsearch',
          name: i18n.translate('xpack.enterpriseSearch.nav.elasticsearchTitle', {
            defaultMessage: 'Elasticsearch',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: ELASTICSEARCH_PLUGIN.URL,
          }),
        },
        {
          id: 'searchExperiences',
          name: i18n.translate('xpack.enterpriseSearch.nav.searchExperiencesTitle', {
            defaultMessage: 'Search Experiences',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: SEARCH_EXPERIENCES_PLUGIN.URL,
          }),
        },
        ...(productAccess.hasAppSearchAccess
          ? [
              {
                id: 'app_search',
                name: i18n.translate('xpack.enterpriseSearch.nav.appSearchTitle', {
                  defaultMessage: 'App Search',
                }),
                ...generateNavLink({
                  shouldNotCreateHref: true,
                  to: APP_SEARCH_PLUGIN.URL,
                }),
              },
            ]
          : []),
        ...(productAccess.hasWorkplaceSearchAccess
          ? [
              {
                id: 'workplace_search',
                name: i18n.translate('xpack.enterpriseSearch.nav.workplaceSearchTitle', {
                  defaultMessage: 'Workplace Search',
                }),
                ...generateNavLink({
                  shouldNotCreateHref: true,
                  to: WORKPLACE_SEARCH_PLUGIN.URL,
                }),
              },
            ]
          : []),
      ],
      name: i18n.translate('xpack.enterpriseSearch.nav.searchTitle', {
        defaultMessage: 'Search',
      }),
    },
  ];

  return navItems;
};
