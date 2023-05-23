/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import {
  ChromeNavigationNodeViewModel,
  Navigation,
  NavigationKibanaProvider,
} from '@kbn/shared-ux-chrome-navigation';
import React from 'react';
import { i18n } from '@kbn/i18n';

const NAVIGATION_PLATFORM_CONFIG = {
  analytics: { enabled: false },
  ml: { enabled: false },
  devTools: { enabled: false },
  management: { enabled: false },
};

const navItems: ChromeNavigationNodeViewModel[] = [
  {
    id: 'search_getting_started',
    title: i18n.translate('xpack.serverlessSearch.nav.gettingStarted', {
      defaultMessage: 'Getting started',
    }),
    href: '/app/elasticsearch',
  },
  {
    id: 'dev_tools',
    title: i18n.translate('xpack.serverlessSearch.nav.devTools', { defaultMessage: 'Dev Tools' }),
    items: [
      {
        id: 'dev_tools_console',
        title: i18n.translate('xpack.serverlessSearch.nav.devTools.console', {
          defaultMessage: 'Console',
        }),
        href: '/app/dev_tools#/console',
      },
      {
        id: 'dev_tools_profiler',
        title: i18n.translate('xpack.serverlessSearch.nav.devTools.searchProfiler', {
          defaultMessage: 'Search Profiler',
        }),
        href: '/app/dev_tools#/searchprofiler',
      },
      {
        id: 'dev_tools_grok_debugger',
        title: i18n.translate('xpack.serverlessSearch.nav.devTools.grokDebugger', {
          defaultMessage: 'Grok debugger',
        }),
        href: '/app/dev_tools#/grokdebugger',
      },
      {
        id: 'dev_tools_painless_lab',
        title: i18n.translate('xpack.serverlessSearch.nav.devTools.painlessLab', {
          defaultMessage: 'Painless Lab',
        }),
        href: '/app/dev_tools#/painless_lab',
      },
    ],
  },
  {
    id: 'explore',
    title: i18n.translate('xpack.serverlessSearch.nav.explore', { defaultMessage: 'Explore' }),
    items: [
      {
        id: 'explore_discover',
        title: i18n.translate('xpack.serverlessSearch.nav.explore.discover', {
          defaultMessage: 'Discover',
        }),
        href: '/app/discover',
      },
      {
        id: 'explore_dashboard',
        title: i18n.translate('xpack.serverlessSearch.nav.explore.dashboard', {
          defaultMessage: 'Dashboard',
        }),
        href: '/app/dashboards',
      },
      {
        id: 'explore_visualize_library',
        title: i18n.translate('xpack.serverlessSearch.nav.explore.visualizeLibrary', {
          defaultMessage: 'Visualize Library',
        }),
        href: '/app/visualize',
      },
    ],
  },
  {
    id: 'content',
    title: i18n.translate('xpack.serverlessSearch.nav.content', { defaultMessage: 'Content' }),
    items: [
      {
        id: 'content_indices',
        title: i18n.translate('xpack.serverlessSearch.nav.content.indices', {
          defaultMessage: 'Indices',
        }),
        // TODO: this will be updated to a new Indices page
        href: '/app/management/data/index_management/indices',
      },
      {
        id: 'content_transforms',
        title: i18n.translate('xpack.serverlessSearch.nav.content.transforms', {
          defaultMessage: 'Transforms',
        }),
        // TODO: this will be updated to a new Transforms page
        href: '/app/management/ingest/ingest_pipelines',
      },
      {
        id: 'content_indexing_api',
        title: i18n.translate('xpack.serverlessSearch.nav.content.indexingApi', {
          defaultMessage: 'Indexing API',
        }),
        // TODO: this page does not exist yet, linking to getting started for now
        href: '/app/elasticsearch',
      },
    ],
  },
  {
    id: 'security',
    title: i18n.translate('xpack.serverlessSearch.nav.security', { defaultMessage: 'Security' }),
    items: [
      {
        id: 'security_api_keys',
        title: i18n.translate('xpack.serverlessSearch.nav.security.apiKeys', {
          defaultMessage: 'API Keys',
        }),
        href: '/app/management/security/api_keys',
      },
    ],
  },
];

export const createServerlessSearchSideNavComponent = (core: CoreStart) => () => {
  // Currently, this allows the "Search" section of the side nav to render as pre-expanded.
  // This will soon be powered from state received from core.chrome
  const activeNavItemId = 'search_project_nav.search_getting_started';

  return (
    <NavigationKibanaProvider core={core}>
      <Navigation
        platformConfig={NAVIGATION_PLATFORM_CONFIG}
        navigationTree={[
          {
            id: 'search_project_nav',
            items: navItems,
            title: 'Elasticsearch',
            icon: 'logoElasticsearch',
          },
        ]}
        activeNavItemId={activeNavItemId}
        homeHref="/app/elasticsearch"
        linkToCloud="projects"
        dataTestSubj="svlSearchSideNav"
      />
    </NavigationKibanaProvider>
  );
};
