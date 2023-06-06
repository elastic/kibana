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
  getPresets,
} from '@kbn/shared-ux-chrome-navigation';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { ServerlessPluginStart } from '@kbn/serverless/public';

const devTools = getPresets('devtools');

const navigationTree: NavigationTreeDefinition = {
  body: [
    { type: 'recentlyAccessed' },
    {
      type: 'navGroup',
      id: 'search_project_nav',
      title: 'Elasticsearch',
      icon: 'logoElasticsearch',
      defaultIsCollapsed: false,
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
          children: devTools.children[0].children,
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
};

export const createServerlessSearchSideNavComponent =
  (core: CoreStart, { serverless }: { serverless: ServerlessPluginStart }) =>
  () => {
    return (
      <NavigationKibanaProvider core={core} serverless={serverless}>
        <DefaultNavigation navigationTree={navigationTree} dataTestSubj="svlSearchSideNav" />
      </NavigationKibanaProvider>
    );
  };
