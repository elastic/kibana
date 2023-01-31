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
  EngineViewTabs,
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
        defaultMessage: 'Behavioral Analytics',
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

  if (enginesSectionEnabled) {
    return [
      navItems[0], // Overview
      navItems[1], // Content
      {
        id: 'enginesSearch', // TODO: just search? or wait for that
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
            id: 'enterpriseSearchEngines',
            name: i18n.translate('xpack.enterpriseSearch.nav.enginesTitle', {
              defaultMessage: 'Engines',
            }),
            ...generateNavLink({
              shouldNotCreateHref: true,
              to: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + ENGINES_PATH,
            }),
          },
        ],
        name: i18n.translate('xpack.enterpriseSearch.nav.searchTitle', {
          defaultMessage: 'Search',
        }),
      },
      navItems[2], // Behavioural Analytics
      ...(productAccess.hasAppSearchAccess || productAccess.hasWorkplaceSearchAccess
        ? [
            {
              id: 'standaloneExperiences',
              items: [
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
              name: i18n.translate('xpack.enterpriseSearch.nav.standaloneExperiencesTitle', {
                defaultMessage: 'Standalone Experiences',
              }),
            },
          ]
        : []),
    ];
  }

  return navItems;
};

export const useEnterpriseSearchEngineNav = (engineName?: string, isEmptyState?: boolean) => {
  const navItems = useEnterpriseSearchNav();
  if (!engineName) return navItems;
  const searchItem = navItems.find((item) => item.id === 'enginesSearch');
  if (!searchItem || !searchItem.items) return navItems;
  const enginesItem = searchItem.items[1];
  if (!enginesItem || enginesItem.id !== 'enterpriseSearchEngines') return navItems;

  const enginePath = `${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}${ENGINES_PATH}/${engineName}`;

  enginesItem.items = !isEmptyState
    ? [
        {
          id: 'engineId',
          name: engineName,
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: enginePath,
          }),
          items: [
            {
              id: 'enterpriseSearchEngineOverview',
              name: i18n.translate('xpack.enterpriseSearch.nav.engine.overviewTitle', {
                defaultMessage: 'Overview',
              }),
              ...generateNavLink({
                shouldNotCreateHref: true,
                to: `${enginePath}/${EngineViewTabs.OVERVIEW}`,
              }),
            },
            {
              id: 'enterpriseSearchEngineIndices',
              name: i18n.translate('xpack.enterpriseSearch.nav.engine.indicesTitle', {
                defaultMessage: 'Indices',
              }),
              ...generateNavLink({
                shouldNotCreateHref: true,
                to: `${enginePath}/${EngineViewTabs.INDICES}`,
              }),
            },

            {
              id: 'enterpriseSearchEngineDocuments',
              name: i18n.translate('xpack.enterpriseSearch.nav.engine.documentsTitle', {
                defaultMessage: 'Documents',
              }),
              ...generateNavLink({
                shouldNotCreateHref: true,
                to: `${enginePath}/${EngineViewTabs.DOCUMENTS}`,
              }),
            },
            {
              id: 'enterpriseSearchEngineSchema',
              name: i18n.translate('xpack.enterpriseSearch.nav.engine.schemaTitle', {
                defaultMessage: 'Schema',
              }),
              ...generateNavLink({
                shouldNotCreateHref: true,
                to: `${enginePath}/${EngineViewTabs.SCHEMA}`,
              }),
            },
            {
              id: 'enterpriseSearchEnginePreview',
              name: i18n.translate('xpack.enterpriseSearch.nav.engine.previewTitle', {
                defaultMessage: 'Preview',
              }),
              ...generateNavLink({
                shouldNotCreateHref: true,
                to: `${enginePath}/${EngineViewTabs.PREVIEW}`,
              }),
            },
            {
              id: 'enterpriseSearchEngineAPI',
              name: i18n.translate('xpack.enterpriseSearch.nav.engine.apiTitle', {
                defaultMessage: 'API',
              }),
              ...generateNavLink({
                shouldNotCreateHref: true,
                to: `${enginePath}/${EngineViewTabs.API}`,
              }),
            },
          ],
        },
      ]
    : [
        {
          id: 'engineId',
          name: engineName,
          ...generateNavLink({
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: true,
            to: enginePath,
          }),
        },
      ];

  return navItems;
};
