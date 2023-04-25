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
      id: 'applications',
      items: [
        {
          id: 'searchApplications',
          name: i18n.translate('xpack.enterpriseSearch.nav.searchApplicationsTitle', {
            defaultMessage: 'Search Applications',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + ENGINES_PATH,
          }),
        },
        {
          id: 'analyticsCollections',
          name: i18n.translate('xpack.enterpriseSearch.nav.analyticsTitle', {
            defaultMessage: 'Behavioral Analytics',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: ANALYTICS_PLUGIN.URL,
          }),
        },
      ],
      name: i18n.translate('xpack.enterpriseSearch.nav.applicationsTitle', {
        defaultMessage: 'Applications',
      }),
    },
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

  return navItems;
};

export const useEnterpriseSearchEngineNav = (engineName?: string, isEmptyState?: boolean) => {
  const navItems = useEnterpriseSearchNav();
  if (!engineName) return navItems;
  const applicationsItem = navItems.find((item) => item.id === 'applications');
  if (!applicationsItem || !applicationsItem.items) return navItems;
  const enginesItem = applicationsItem.items?.find((item) => item.id === 'searchApplications');
  if (!enginesItem || enginesItem.id !== 'searchApplications') return navItems;

  const enginePath = `${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}${ENGINES_PATH}/${engineName}`;

  enginesItem.items = !isEmptyState
    ? [
        {
          id: 'engineId',
          name: engineName,
          ...generateNavLink({
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: true,
            to: enginePath,
          }),
          items: [
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
              id: 'enterpriseSearchApplicationsContent',
              name: i18n.translate('xpack.enterpriseSearch.nav.engine.contentTitle', {
                defaultMessage: 'Content',
              }),
              ...generateNavLink({
                shouldNotCreateHref: true,
                shouldShowActiveForSubroutes: true,
                to: `${enginePath}/${EngineViewTabs.CONTENT}`,
              }),
            },
            {
              id: 'enterpriseSearchApplicationConnect',
              name: i18n.translate(
                'xpack.enterpriseSearch.nav.applications.searchApplications.connectTitle',
                {
                  defaultMessage: 'Connect',
                }
              ),
              ...generateNavLink({
                shouldNotCreateHref: true,
                shouldShowActiveForSubroutes: true,
                to: `${enginePath}/${EngineViewTabs.CONNECT}`,
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
  const applicationsNav = navItems.find((item) => item.id === 'applications');
  const analyticsNav = applicationsNav?.items?.find((item) => item.id === 'analyticsCollections');

  if (!name || !paths || !analyticsNav) return navItems;

  analyticsNav.items = [
    {
      id: 'analyticsCollection',
      items: [
        {
          id: 'analyticsCollectionOverview',
          name: i18n.translate('xpack.enterpriseSearch.nav.analyticsCollections.overviewTitle', {
            defaultMessage: 'Overview',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: ANALYTICS_PLUGIN.URL + paths.overview,
          }),
        },
        {
          id: 'analyticsCollectionExplorer',
          name: i18n.translate('xpack.enterpriseSearch.nav.analyticsCollections.explorerTitle', {
            defaultMessage: 'Explorer',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: ANALYTICS_PLUGIN.URL + paths.explorer,
          }),
        },
        {
          id: 'analyticsCollectionIntegration',
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
