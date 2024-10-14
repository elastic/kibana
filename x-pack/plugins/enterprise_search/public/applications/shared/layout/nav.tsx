/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiIcon, EuiText } from '@elastic/eui';
import type { EuiSideNavItemTypeEnhanced } from '@kbn/core-chrome-browser';
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
  SEARCH_RELEVANCE_PLUGIN,
  SEMANTIC_SEARCH_PLUGIN,
} from '../../../../common/constants';
import {
  SEARCH_APPLICATIONS_PATH,
  SearchApplicationViewTabs,
  PLAYGROUND_PATH,
} from '../../applications/routes';
import { useIndicesNav } from '../../enterprise_search_content/components/search_index/indices/indices_nav';
import {
  CONNECTORS_PATH,
  CRAWLERS_PATH,
  SEARCH_INDICES_PATH,
} from '../../enterprise_search_content/routes';

import { INFERENCE_ENDPOINTS_PATH } from '../../enterprise_search_relevance/routes';
import { KibanaLogic } from '../kibana';

import { LicensingLogic } from '../licensing';

import { generateNavLink } from './nav_link_helpers';

/**
 * Hook to generate the Enterprise Search navigation items
 *
 * @param alwaysReturn Flag to always return the nav items, even if the sidebar is disabled
 * @returns The Enterprise Search navigation items
 */
export const useEnterpriseSearchNav = (alwaysReturn = false) => {
  const { isSidebarEnabled, productAccess } = useValues(KibanaLogic);

  const { hasEnterpriseLicense } = useValues(LicensingLogic);

  const indicesNavItems = useIndicesNav();

  if (!isSidebarEnabled && !alwaysReturn) return undefined;

  const navItems: Array<EuiSideNavItemTypeEnhanced<unknown>> = [
    {
      'data-test-subj': 'searchSideNav-Home',
      id: 'home',
      name: (
        <EuiText size="s">
          {i18n.translate('xpack.enterpriseSearch.nav.homeTitle', {
            defaultMessage: 'Home',
          })}
        </EuiText>
      ),
      ...generateNavLink({
        shouldNotCreateHref: true,
        shouldShowActiveForSubroutes: true,
        to: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.URL,
      }),
    },
    {
      'data-test-subj': 'searchSideNav-Content',
      id: 'content',
      items: [
        {
          'data-test-subj': 'searchSideNav-Indices',
          id: 'search_indices',
          name: i18n.translate('xpack.enterpriseSearch.nav.searchIndicesTitle', {
            defaultMessage: 'Indices',
          }),
          ...generateNavLink({
            items: indicesNavItems,
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: true,
            to: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + SEARCH_INDICES_PATH,
          }),
        },
        {
          'data-test-subj': 'searchSideNav-Connectors',
          id: 'connectors',
          name: i18n.translate('xpack.enterpriseSearch.nav.connectorsTitle', {
            defaultMessage: 'Connectors',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: true,
            to: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + CONNECTORS_PATH,
          }),
        },
        {
          'data-test-subj': 'searchSideNav-Crawlers',
          id: 'crawlers',
          name: i18n.translate('xpack.enterpriseSearch.nav.crawlersTitle', {
            defaultMessage: 'Web crawlers',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: true,
            to: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + CRAWLERS_PATH,
          }),
        },
      ],
      name: i18n.translate('xpack.enterpriseSearch.nav.contentTitle', {
        defaultMessage: 'Content',
      }),
    },
    {
      'data-test-subj': 'searchSideNav-Build',
      id: 'build',
      items: [
        {
          'data-test-subj': 'searchSideNav-Playground',
          id: 'playground',
          name: i18n.translate('xpack.enterpriseSearch.nav.PlaygroundTitle', {
            defaultMessage: 'Playground',
          }),
          ...generateNavLink({
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: true,
            to: APPLICATIONS_PLUGIN.URL + PLAYGROUND_PATH,
          }),
        },
        {
          'data-test-subj': 'searchSideNav-SearchApplications',
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
          'data-test-subj': 'searchSideNav-BehavioralAnalytics',
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
        defaultMessage: 'Build',
      }),
    },
    ...(hasEnterpriseLicense
      ? [
          {
            'data-test-subj': 'searchSideNav-Relevance',
            id: 'relevance',
            items: [
              {
                'data-test-subj': 'searchSideNav-InferenceEndpoints',
                id: 'inference_endpoints',
                name: i18n.translate('xpack.enterpriseSearch.nav.inferenceEndpointsTitle', {
                  defaultMessage: 'Inference Endpoints',
                }),
                ...generateNavLink({
                  shouldNotCreateHref: true,
                  shouldShowActiveForSubroutes: true,
                  to: SEARCH_RELEVANCE_PLUGIN.URL + INFERENCE_ENDPOINTS_PATH,
                }),
              },
            ],
            name: i18n.translate('xpack.enterpriseSearch.nav.relevanceTitle', {
              defaultMessage: 'Relevance',
            }),
          },
        ]
      : []),
    {
      'data-test-subj': 'searchSideNav-GettingStarted',
      id: 'es_getting_started',
      items: [
        {
          'data-test-subj': 'searchSideNav-Elasticsearch',
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
          'data-test-subj': 'searchSideNav-VectorSearch',
          id: 'vectorSearch',
          name: VECTOR_SEARCH_PLUGIN.NAME,
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: VECTOR_SEARCH_PLUGIN.URL,
          }),
        },
        {
          'data-test-subj': 'searchSideNav-SemanticSearch',
          id: 'semanticSearch',
          name: SEMANTIC_SEARCH_PLUGIN.NAME,
          ...generateNavLink({
            shouldNotCreateHref: true,
            to: SEMANTIC_SEARCH_PLUGIN.URL,
          }),
        },
        {
          'data-test-subj': 'searchSideNav-AISearch',
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
      name: i18n.translate('xpack.enterpriseSearch.nav.enterpriseSearchOverviewTitle', {
        defaultMessage: 'Getting started',
      }),
    },
    ...(productAccess.hasAppSearchAccess || productAccess.hasWorkplaceSearchAccess
      ? [
          {
            'data-test-subj': 'searchSideNav-EnterpriseSearch',
            id: 'enterpriseSearch',
            items: [
              ...(productAccess.hasAppSearchAccess
                ? [
                    {
                      'data-test-subj': 'searchSideNav-AppSearch',
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
                      'data-test-subj': 'searchSideNav-WorkplaceSearch',
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
  hasSchemaConflicts?: boolean,
  alwaysReturn?: boolean
) => {
  const navItems = useEnterpriseSearchNav(alwaysReturn);
  if (!navItems) return undefined;
  if (!searchApplicationName) return navItems;
  const applicationsItem = navItems.find((item) => item.id === 'build');
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
              // Required for the new side nav
              iconToString: hasSchemaConflicts ? 'warning' : undefined,
              id: 'enterpriseSearchApplicationsContent',
              name: (
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                  {i18n.translate('xpack.enterpriseSearch.nav.searchApplication.contentTitle', {
                    defaultMessage: 'Content',
                  })}
                  {hasSchemaConflicts && <EuiIcon type="warning" color="danger" />}
                </EuiFlexGroup>
              ),
              // Required for the new side nav
              nameToString: i18n.translate(
                'xpack.enterpriseSearch.nav.searchApplication.contentTitle',
                {
                  defaultMessage: 'Content',
                }
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
  },
  alwaysReturn?: boolean
) => {
  const navItems = useEnterpriseSearchNav(alwaysReturn);

  if (!navItems) return undefined;

  const applicationsNav = navItems.find((item) => item.id === 'build');
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
