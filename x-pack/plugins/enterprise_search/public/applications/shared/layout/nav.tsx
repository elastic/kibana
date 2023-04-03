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
  ENTERPRISE_SEARCH_PRODUCT_NAME,
  SEARCH_EXPERIENCES_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../../../../common/constants';
import {
  ENGINES_PATH,
  SEARCH_INDICES_PATH,
  SETTINGS_PATH,
  EngineViewTabs,
} from '../../enterprise_search_content/routes';
import { KibanaLogic } from '../kibana';

import { generateNavLink } from './nav_link_helpers';

export const useEnterpriseSearchNav = () => {
  const { productAccess, productFeatures } = useValues(KibanaLogic);

  const searchAppsSectionEnabled = productFeatures.hasSearchApplications;

  const navItems: Array<EuiSideNavItemType<unknown>> = [
    {
      id: 'es_overview',
      name: i18n.translate('xpack.enterpriseSearch.nav.enterpriseSearchOverviewTitle', {
        defaultMessage: 'Overview',
      }),
      items: [
        {
          id: 'elasticsearch',
          name: ELASTICSEARCH_PLUGIN.NAV_TITLE,
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
      ],
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
        ...(productFeatures.hasDefaultIngestPipeline
          ? [
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
            ]
          : []),
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
      name: ENTERPRISE_SEARCH_PRODUCT_NAME,
    },
  ];

  if (searchAppsSectionEnabled) {
    return [
      navItems[0], // Overview
      navItems[1], // Content
      {
        id: 'applications',
        items: [
          {
            id: 'search_applications',
            name: i18n.translate('xpack.enterpriseSearch.nav.searchApplicationsTitle', {
              defaultMessage: 'Search Applications',
            }),
            ...generateNavLink({
              shouldNotCreateHref: true,
              to: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + ENGINES_PATH,
            }),
          },
          {
            id: 'analytics_collections',
            name: i18n.translate('xpack.enterpriseSearch.nav.analyticsApplicationsTitle', {
              defaultMessage: 'Analytics',
            }),
            ...generateNavLink({
              shouldNotCreateHref: true,
              shouldShowActiveForSubroutes: true,
              to: ANALYTICS_PLUGIN.URL,
            }),
          },
        ],
        name: i18n.translate('xpack.enterpriseSearch.nav.applicationsTitle', {
          defaultMessage: 'Applications',
        }),
      },
      {
        id: 'enterpriseSearch',
        items: [
          {
            id: 'entsearch_getting_started',
            name: i18n.translate('xpack.enterpriseSearch.nav.enterpriseSearchGettingStartedTitle', {
              defaultMessage: 'Getting Started',
            }),
            ...generateNavLink({
              shouldNotCreateHref: true,
              to: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.URL,
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
        name: ENTERPRISE_SEARCH_PRODUCT_NAME,
      },
    ];
  }

  return navItems;
};

export const useEnterpriseSearchEngineNav = (engineName?: string, isEmptyState?: boolean) => {
  const navItems = useEnterpriseSearchNav();
  if (!engineName) return navItems;
  const searchItem = navItems.find((item) => item.id === 'applications');
  if (!searchItem || !searchItem.items) return navItems;
  const searchAppsItem = (searchItem.items as Array<EuiSideNavItemType<unknown>>).find(
    (item: EuiSideNavItemType<unknown>) => item.id === 'search_applications'
  );
  if (!searchAppsItem) return navItems;

  const enginePath = `${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}${ENGINES_PATH}/${engineName}`;

  searchAppsItem.items = !isEmptyState
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

export const useEnterpriseSearchAnalyticsNav = (
  name?: string,
  paths?: {
    explorer: string;
    integration: string;
    overview: string;
  }
) => {
  const navItems = useEnterpriseSearchNav();

  if (!name || !paths) return navItems;
  // While Search Applications is feature flagged Analytics is either under the parent Analytics or Applications.
  const analyticsNavParent = navItems.find(
    (item) => item.id === 'enterpriseSearchAnalytics' || item.id === 'applications'
  );
  const collectionNav = (
    (analyticsNavParent?.items ?? []) as Array<EuiSideNavItemType<unknown>>
  ).find((item) => item.id === 'analytics_collections');
  if (!collectionNav) return navItems;

  collectionNav.items = [
    {
      id: 'analytics_collections',
      items: [
        {
          id: 'enterpriseSearchEngineOverview',
          name: i18n.translate('xpack.enterpriseSearch.nav.analyticsCollections.overviewTitle', {
            defaultMessage: 'Overview',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: ANALYTICS_PLUGIN.URL + paths.overview,
          }),
        },
        {
          id: 'enterpriseSearchEngineIndices',
          name: i18n.translate('xpack.enterpriseSearch.nav.analyticsCollections.explorerTitle', {
            defaultMessage: 'Explorer',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: ANALYTICS_PLUGIN.URL + paths.explorer,
          }),
        },
        {
          id: 'enterpriseSearchEngineSchema',
          name: i18n.translate('xpack.enterpriseSearch.nav.analyticsCollections.integrationTitle', {
            defaultMessage: 'Integration',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: ANALYTICS_PLUGIN.URL + paths.integration,
          }),
        },
      ],
      name,
    },
  ];

  return navItems;
};
