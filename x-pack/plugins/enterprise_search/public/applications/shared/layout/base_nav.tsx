/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  ELASTICSEARCH_PLUGIN,
  AI_SEARCH_PLUGIN,
  VECTOR_SEARCH_PLUGIN,
  SEMANTIC_SEARCH_PLUGIN,
} from '../../../../common/constants';

import { ClassicNavItem, BuildClassicNavParameters } from '../types';

export const buildBaseClassicNavItems = ({
  hasEnterpriseLicense,
  productAccess,
}: BuildClassicNavParameters): ClassicNavItem[] => {
  const navItems: ClassicNavItem[] = [];

  // Home
  navItems.push({
    'data-test-subj': 'searchSideNav-Home',
    id: 'home',
    name: (
      <EuiText size="s">
        {i18n.translate('xpack.enterpriseSearch.nav.homeTitle', {
          defaultMessage: 'Home',
        })}
      </EuiText>
    ),
    navLink: {
      link: 'enterpriseSearch',
      shouldShowActiveForSubroutes: true,
    },
  });

  // Content
  navItems.push({
    'data-test-subj': 'searchSideNav-Content',
    id: 'content',
    items: [
      {
        'data-test-subj': 'searchSideNav-Indices',
        id: 'search_indices',
        name: i18n.translate('xpack.enterpriseSearch.nav.searchIndicesTitle', {
          defaultMessage: 'Indices',
        }),
        navLink: {
          link: 'enterpriseSearchContent:searchIndices',
          shouldShowActiveForSubroutes: true,
        },
      },
      {
        'data-test-subj': 'searchSideNav-Connectors',
        id: 'connectors',
        name: i18n.translate('xpack.enterpriseSearch.nav.connectorsTitle', {
          defaultMessage: 'Connectors',
        }),
        navLink: {
          link: 'enterpriseSearchContent:connectors',
          shouldShowActiveForSubroutes: true,
        },
      },
      {
        'data-test-subj': 'searchSideNav-Crawlers',
        id: 'crawlers',
        name: i18n.translate('xpack.enterpriseSearch.nav.crawlersTitle', {
          defaultMessage: 'Web crawlers',
        }),
        navLink: {
          link: 'enterpriseSearchContent:webCrawlers',
          shouldShowActiveForSubroutes: true,
        },
      },
    ],
    name: i18n.translate('xpack.enterpriseSearch.nav.contentTitle', {
      defaultMessage: 'Content',
    }),
  });

  // Build
  navItems.push({
    'data-test-subj': 'searchSideNav-Build',
    id: 'build',
    items: [
      {
        'data-test-subj': 'searchSideNav-Playground',
        id: 'playground',
        name: i18n.translate('xpack.enterpriseSearch.nav.PlaygroundTitle', {
          defaultMessage: 'Playground',
        }),
        navLink: {
          link: 'enterpriseSearchApplications:playground',
          shouldShowActiveForSubroutes: true,
        },
      },
      {
        'data-test-subj': 'searchSideNav-SearchApplications',
        id: 'searchApplications',
        name: i18n.translate('xpack.enterpriseSearch.nav.searchApplicationsTitle', {
          defaultMessage: 'Search Applications',
        }),
        navLink: {
          link: 'enterpriseSearchApplications:searchApplications',
        },
      },
      {
        'data-test-subj': 'searchSideNav-BehavioralAnalytics',
        id: 'analyticsCollections',
        name: i18n.translate('xpack.enterpriseSearch.nav.analyticsTitle', {
          defaultMessage: 'Behavioral Analytics',
        }),
        navLink: {
          link: 'enterpriseSearchAnalytics',
          shouldNotCreateHref: true,
        },
      },
    ],
    name: i18n.translate('xpack.enterpriseSearch.nav.applicationsTitle', {
      defaultMessage: 'Build',
    }),
  });

  if (hasEnterpriseLicense) {
    // Relevance
    navItems.push({
      'data-test-subj': 'searchSideNav-Relevance',
      id: 'relevance',
      items: [
        {
          'data-test-subj': 'searchSideNav-InferenceEndpoints',
          id: 'inference_endpoints',
          name: i18n.translate('xpack.enterpriseSearch.nav.inferenceEndpointsTitle', {
            defaultMessage: 'Inference Endpoints',
          }),
          navLink: {
            link: 'enterpriseSearchRelevance:inferenceEndpoints',
            shouldShowActiveForSubroutes: true,
          },
        },
      ],
      name: i18n.translate('xpack.enterpriseSearch.nav.relevanceTitle', {
        defaultMessage: 'Relevance',
      }),
    });
  }

  // Getting Started
  navItems.push({
    'data-test-subj': 'searchSideNav-GettingStarted',
    id: 'es_getting_started',
    items: [
      {
        'data-test-subj': 'searchSideNav-Elasticsearch',
        id: 'elasticsearch',
        name: i18n.translate('xpack.enterpriseSearch.nav.elasticsearchTitle', {
          defaultMessage: 'Elasticsearch',
        }),
        navLink: {
          shouldNotCreateHref: true,
          to: ELASTICSEARCH_PLUGIN.URL,
        },
      },
      {
        'data-test-subj': 'searchSideNav-VectorSearch',
        id: 'vectorSearch',
        name: VECTOR_SEARCH_PLUGIN.NAME,
        navLink: {
          shouldNotCreateHref: true,
          to: VECTOR_SEARCH_PLUGIN.URL,
        },
      },
      {
        'data-test-subj': 'searchSideNav-SemanticSearch',
        id: 'semanticSearch',
        name: SEMANTIC_SEARCH_PLUGIN.NAME,
        navLink: {
          shouldNotCreateHref: true,
          to: SEMANTIC_SEARCH_PLUGIN.URL,
        },
      },
      {
        'data-test-subj': 'searchSideNav-AISearch',
        id: 'aiSearch',
        name: i18n.translate('xpack.enterpriseSearch.nav.aiSearchTitle', {
          defaultMessage: 'AI Search',
        }),
        navLink: {
          shouldNotCreateHref: true,
          to: AI_SEARCH_PLUGIN.URL,
        },
      },
    ],
    name: i18n.translate('xpack.enterpriseSearch.nav.enterpriseSearchOverviewTitle', {
      defaultMessage: 'Getting started',
    }),
  });

  if (productAccess.hasAppSearchAccess || productAccess.hasWorkplaceSearchAccess) {
    const entSearchItems: ClassicNavItem[] = [];
    if (productAccess.hasAppSearchAccess) {
      entSearchItems.push({
        'data-test-subj': 'searchSideNav-AppSearch',
        id: 'app_search',
        name: i18n.translate('xpack.enterpriseSearch.nav.appSearchTitle', {
          defaultMessage: 'App Search',
        }),
        navLink: {
          link: 'appSearch:engines',
        },
      });
    }
    if (productAccess.hasWorkplaceSearchAccess) {
      entSearchItems.push({
        'data-test-subj': 'searchSideNav-WorkplaceSearch',
        id: 'workplace_search',
        name: i18n.translate('xpack.enterpriseSearch.nav.workplaceSearchTitle', {
          defaultMessage: 'Workplace Search',
        }),
        navLink: {
          link: 'workplaceSearch',
        },
      });
    }
    navItems.push({
      'data-test-subj': 'searchSideNav-EnterpriseSearch',
      id: 'enterpriseSearch',
      items: entSearchItems,
      name: i18n.translate('xpack.enterpriseSearch.nav.title', {
        defaultMessage: 'Enterprise Search',
      }),
    });
  }

  return navItems;
};
