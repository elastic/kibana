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

const navigationTree: NavigationTreeDefinition = {
  body: [
    { type: 'cloudLink', preset: 'projects' },
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
          children: getPresets('devtools').children[0].children,
        },
        {
          id: 'explore',
          title: i18n.translate('xpack.serverlessSearch.nav.explore', {
            defaultMessage: 'Explore',
          }),
          children: [
            {
              link: 'discover',
            },
            {
              link: 'dashboards',
            },
            {
              link: 'visualize',
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
              title: i18n.translate('xpack.serverlessSearch.nav.content.indices', {
                defaultMessage: 'Indices',
              }),
              // TODO: this will be updated to a new Indices page
              link: 'management:index_management',
            },
            {
              title: i18n.translate('xpack.serverlessSearch.nav.content.transforms', {
                defaultMessage: 'Transforms',
              }),
              // TODO: this will be updated to a new Transforms page
              link: 'management:ingest_pipelines',
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
              link: 'management:api_keys',
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
