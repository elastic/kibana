/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import {
  DefaultNavigation,
  NavigationKibanaProvider,
  type NavigationTreeDefinition,
} from '@kbn/shared-ux-chrome-navigation';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';

const navigationTree: NavigationTreeDefinition = {
  body: [
    { type: 'recentlyAccessed' },
    {
      type: 'navGroup',
      id: 'search_project_nav',
      title: 'Elasticsearch',
      icon: 'logoElasticsearch',
      defaultIsCollapsed: false,
      breadcrumbStatus: 'hidden',
      children: [
        {
          id: 'search_getting_started',
          title: i18n.translate('xpack.serverlessSearch.nav.gettingStarted', {
            defaultMessage: 'Getting started',
          }),
          link: 'serverlessElasticsearch',
        },
        {
          id: 'dev_tools',
          title: i18n.translate('xpack.serverlessSearch.nav.devTools', {
            defaultMessage: 'Dev Tools',
          }),
          children: [{ link: 'dev_tools:console' }, { link: 'dev_tools:searchprofiler' }],
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
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.startsWith(prepend('/app/dashboards'));
              },
            },
            {
              link: 'visualize',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return (
                  pathNameSerialized.startsWith(prepend('/app/visualize')) ||
                  pathNameSerialized.startsWith(prepend('/app/lens')) ||
                  pathNameSerialized.startsWith(prepend('/app/maps'))
                );
              },
            },
            {
              link: 'management:triggersActions',
              title: i18n.translate('xpack.serverlessSearch.nav.alerts', {
                defaultMessage: 'Alerts',
              }),
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
                defaultMessage: 'Index Management',
              }),
              link: 'management:index_management',
            },
            {
              title: i18n.translate('xpack.serverlessSearch.nav.content.pipelines', {
                defaultMessage: 'Pipelines',
              }),
              link: 'management:ingest_pipelines',
            },
            {
              id: 'content_indexing_api',
              link: 'serverlessIndexingApi',
              title: i18n.translate('xpack.serverlessSearch.nav.content.indexingApi', {
                defaultMessage: 'Indexing API',
              }),
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
  footer: [
    {
      type: 'navGroup',
      id: 'project_settings_project_nav',
      title: i18n.translate('xpack.serverlessSearch.nav.projectSettings', {
        defaultMessage: 'Project settings',
      }),
      icon: 'gear',
      breadcrumbStatus: 'hidden',
      children: [
        {
          id: 'settings',
          children: [
            {
              link: 'management',
              title: i18n.translate('xpack.serverlessSearch.nav.mngt', {
                defaultMessage: 'Management',
              }),
            },
            {
              id: 'cloudLinkDeployment',
              cloudLink: 'deployment',
              title: i18n.translate('xpack.serverlessSearch.nav.performance', {
                defaultMessage: 'Performance',
              }),
            },
            {
              id: 'cloudLinkUserAndRoles',
              cloudLink: 'userAndRoles',
            },
            {
              id: 'cloudLinkBilling',
              cloudLink: 'billingAndSub',
            },
          ],
        },
      ],
    },
  ],
};

export const createServerlessSearchSideNavComponent =
  (
    core: CoreStart,
    { serverless, cloud }: { serverless: ServerlessPluginStart; cloud: CloudStart }
  ) =>
  () => {
    return (
      <NavigationKibanaProvider core={core} serverless={serverless} cloud={cloud}>
        <DefaultNavigation navigationTree={navigationTree} dataTestSubj="svlSearchSideNav" />
      </NavigationKibanaProvider>
    );
  };
