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

import { SEARCH_APPLICATIONS_PATH, PLAYGROUND_PATH } from '../../applications/routes';
import {
  CONNECTORS_PATH,
  CRAWLERS_PATH,
  SEARCH_INDICES_PATH,
} from '../../enterprise_search_content/routes';
import { INFERENCE_ENDPOINTS_PATH } from '../../enterprise_search_relevance/routes';

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
      shouldNotCreateHref: true,
      shouldShowActiveForSubroutes: true,
      to: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.URL,
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
          shouldNotCreateHref: true,
          shouldShowActiveForSubroutes: true,
          to: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + SEARCH_INDICES_PATH,
        },
      },
      {
        'data-test-subj': 'searchSideNav-Connectors',
        id: 'connectors',
        name: i18n.translate('xpack.enterpriseSearch.nav.connectorsTitle', {
          defaultMessage: 'Connectors',
        }),
        navLink: {
          shouldNotCreateHref: true,
          shouldShowActiveForSubroutes: true,
          to: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + CONNECTORS_PATH,
        },
      },
      {
        'data-test-subj': 'searchSideNav-Crawlers',
        id: 'crawlers',
        name: i18n.translate('xpack.enterpriseSearch.nav.crawlersTitle', {
          defaultMessage: 'Web crawlers',
        }),
        navLink: {
          shouldNotCreateHref: true,
          shouldShowActiveForSubroutes: true,
          to: ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL + CRAWLERS_PATH,
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
          shouldNotCreateHref: true,
          shouldShowActiveForSubroutes: true,
          to: APPLICATIONS_PLUGIN.URL + PLAYGROUND_PATH,
        },
      },
      {
        'data-test-subj': 'searchSideNav-SearchApplications',
        id: 'searchApplications',
        name: i18n.translate('xpack.enterpriseSearch.nav.searchApplicationsTitle', {
          defaultMessage: 'Search Applications',
        }),
        navLink: {
          shouldNotCreateHref: true,
          to: APPLICATIONS_PLUGIN.URL + SEARCH_APPLICATIONS_PATH,
        },
      },
      {
        'data-test-subj': 'searchSideNav-BehavioralAnalytics',
        id: 'analyticsCollections',
        name: i18n.translate('xpack.enterpriseSearch.nav.analyticsTitle', {
          defaultMessage: 'Behavioral Analytics',
        }),
        navLink: {
          shouldNotCreateHref: true,
          to: ANALYTICS_PLUGIN.URL,
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
            shouldNotCreateHref: true,
            shouldShowActiveForSubroutes: true,
            to: SEARCH_RELEVANCE_PLUGIN.URL + INFERENCE_ENDPOINTS_PATH,
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
          shouldNotCreateHref: true,
          to: APP_SEARCH_PLUGIN.URL,
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
          shouldNotCreateHref: true,
          to: WORKPLACE_SEARCH_PLUGIN.URL,
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
