/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import {
  DefaultNavigation,
  NavigationKibanaProvider,
  NavigationTreeDefinition,
} from '@kbn/shared-ux-chrome-navigation';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ServerlessPluginStart } from '@kbn/serverless/public';

const navigationTree: NavigationTreeDefinition = {
  body: [
    {
      type: 'cloudLink',
      preset: 'projects',
    },
    {
      type: 'navGroup',
      id: 'search_project_nav',
      title: 'Elasticsearch',
      icon: 'logoElasticsearch',
      children: [
        {
          id: 'root',
          children: [
            {
              id: 'search_getting_started',
              title: i18n.translate('xpack.serverlessSearch.nav.gettingStarted', {
                defaultMessage: 'Getting started',
              }),
              href: '/app/elasticsearch',
            },
            {
              id: 'dev_tools',
              title: i18n.translate('xpack.serverlessSearch.nav.devTools', {
                defaultMessage: 'Dev Tools',
              }),
              children: [
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
              title: i18n.translate('xpack.serverlessSearch.nav.explore', {
                defaultMessage: 'Explore',
              }),
              children: [
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
              title: i18n.translate('xpack.serverlessSearch.nav.content', {
                defaultMessage: 'Content',
              }),
              children: [
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
              title: i18n.translate('xpack.serverlessSearch.nav.security', {
                defaultMessage: 'Security',
              }),
              children: [
                {
                  id: 'security_api_keys',
                  title: i18n.translate('xpack.serverlessSearch.nav.security.apiKeys', {
                    defaultMessage: 'API Keys',
                  }),
                  href: '/app/management/security/api_keys',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const createServerlessSearchSideNavComponent =
  (core: CoreStart, { serverless }: { serverless: ServerlessPluginStart }) =>
  () => {
    return (
      <NavigationKibanaProvider core={core} serverless={serverless}>
        <DefaultNavigation
          homeRef="/app/elasticsearch"
          navigationTree={navigationTree}
          dataTestSubj="svlSearchSideNav"
        />
      </NavigationKibanaProvider>
    );
  };
