/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiIcon, EuiSideNavItemType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  ANALYTICS_PLUGIN,
  APPLICATIONS_PLUGIN,
  APP_SEARCH_PLUGIN,
  ELASTICSEARCH_PLUGIN,
  ENTERPRISE_SEARCH_CONTENT_PLUGIN,
  ENTERPRISE_SEARCH_OVERVIEW_PLUGIN,
  AI_SEARCH_PLUGIN,
  VECTOR_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../../../../common/constants';
import { SEARCH_APPLICATIONS_PATH, SearchApplicationViewTabs } from '../../applications/routes';
import { SEARCH_INDICES_PATH, SETTINGS_PATH } from '../../enterprise_search_content/routes';
import { KibanaLogic } from '../kibana';

import { generateNavLink } from './nav_link_helpers';

export const useEnterpriseSearchNav = () => {
  const { isSidebarEnabled, productAccess, productFeatures } = useValues(KibanaLogic);
  if (!isSidebarEnabled) return undefined;

  const navItems: Array<EuiSideNavItemType<unknown>> = [
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
            to: APPLICATIONS_PLUGIN.URL + SEARCH_APPLICATIONS_PATH,
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
    {
      id: 'es_getting_started',
      name: i18n.translate('xpack.enterpriseSearch.nav.enterpriseSearchOverviewTitle', {
        defaultMessage: 'Getting started',
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
          id: 'vectorSearch',
          name: VECTOR_SEARCH_PLUGIN.NAME,
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: VECTOR_SEARCH_PLUGIN.URL,
          }),
        },
        {
          id: 'aiSearch',
          name: i18n.translate('xpack.enterpriseSearch.nav.aiSearchTitle', {
            defaultMessage: 'AI Search',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: AI_SEARCH_PLUGIN.URL,
          }),
        },
      ],
    },
    ...(productAccess.hasAppSearchAccess || productAccess.hasWorkplaceSearchAccess
      ? [
          {
            id: 'enterpriseSearch',
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
            name: i18n.translate('xpack.enterpriseSearch.nav.title', {
              defaultMessage: 'Enterprise Search',
            }),
          },
        ]
      : []),
  ];

  return navItems;
};

export const useEnterpriseSearchApplicationNav = (
  searchApplicationName?: string,
  isEmptyState?: boolean,
  hasSchemaConflicts?: boolean
) => {
  const navItems = useEnterpriseSearchNav();
  if (!navItems) return undefined;
  if (!searchApplicationName) return navItems;
  const applicationsItem = navItems.find((item) => item.id === 'applications');
  if (!applicationsItem || !applicationsItem.items) return navItems;
  const searchApplicationsItem = applicationsItem.items?.find(
    (item) => item.id === 'searchApplications'
  );
  if (!searchApplicationsItem || searchApplicationsItem.id !== 'searchApplications')
    return navItems;

  const searchApplicationPath = `${APPLICATIONS_PLUGIN.URL}${SEARCH_APPLICATIONS_PATH}/${searchApplicationName}`;

  searchApplicationsItem.items = !isEmptyState
    ? [
        {
          id: 'searchApplicationId',
          name: searchApplicationName,
          ...generateNavLink({
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: false,
            to: searchApplicationPath,
          }),
          items: [
            {
              id: 'enterpriseSearchApplicationDocsExplorer',
              name: i18n.translate(
                'xpack.enterpriseSearch.nav.searchApplication.docsExplorerTitle',
                {
                  defaultMessage: 'Docs Explorer',
                }
              ),
              ...generateNavLink({
                shouldNotCreateHref: true,
                to: `${searchApplicationPath}/${SearchApplicationViewTabs.DOCS_EXPLORER}`,
              }),
            },
            {
              id: 'enterpriseSearchApplicationsContent',
              name: (
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                  {i18n.translate('xpack.enterpriseSearch.nav.searchApplication.contentTitle', {
                    defaultMessage: 'Content',
                  })}
                  {hasSchemaConflicts && <EuiIcon type="warning" color="danger" />}
                </EuiFlexGroup>
              ),
              ...generateNavLink({
                shouldNotCreateHref: true,
                shouldShowActiveForSubroutes: true,
                to: `${searchApplicationPath}/${SearchApplicationViewTabs.CONTENT}`,
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
                to: `${searchApplicationPath}/${SearchApplicationViewTabs.CONNECT}`,
              }),
            },
          ],
        },
      ]
    : [
        {
          id: 'searchApplicationId',
          name: searchApplicationName,
          ...generateNavLink({
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: true,
            to: searchApplicationPath,
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

  if (!navItems) return undefined;

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
