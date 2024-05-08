/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';

import type {
  SolutionNavigationDefinition,
  NavigationTreeDefinition,
} from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

const title = i18n.translate('navigation.searchNav.headerSolutionSwitcher.searchSolutionTitle', {
  defaultMessage: 'Search',
});
const icon = 'logoElasticsearch';

const navTree: NavigationTreeDefinition = {
  body: [
    { type: 'recentlyAccessed' },
    {
      breadcrumbStatus: 'hidden',
      children: [
        {
          link: 'enterpriseSearch',
        },
        {
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.startsWith(prepend('/app/dev_tools'));
          },
          id: 'dev_tools',
          link: 'dev_tools:console',
          title: i18n.translate('navigation.searchNav.devTools', {
            defaultMessage: 'Dev Tools',
          }),
        },
        {
          children: [
            {
              link: 'discover',
            },
            {
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.startsWith(prepend('/app/dashboards'));
              },
              link: 'dashboards',
            },
          ],
          id: 'kibana',
          title: i18n.translate('navigation.searchNav.kibana', {
            defaultMessage: 'Kibana',
          }),
        },
        {
          children: [
            {
              link: 'enterpriseSearchContent:searchIndices',
              // TODO: Build the children dynamically
              // https://github.com/elastic/kibana/issues/179751
              // renderAs: 'accordion',
              // children: [
              //   {
              //     title: i18n.translate(
              //       'navigation.searchNav.content.indices.searchGithub.overview',
              //       {
              //         defaultMessage: 'Overview',
              //       }
              //     ),
              //     link: 'management:index_management',
              //     breadcrumbStatus:
              //       'hidden' /* management sub-pages set their breadcrumbs themselves */,
              //   },
              //   {
              //     title: i18n.translate(
              //       'navigation.searchNav.content.indices.searchGithub.documents',
              //       {
              //         defaultMessage: 'Documents',
              //       }
              //     ),
              //     link: 'management:index_management',
              //   },
              //   {
              //     title: i18n.translate(
              //       'navigation.searchNav.content.indices.searchGithub.indexMappings',
              //       {
              //         defaultMessage: 'Index Mappings',
              //       }
              //     ),
              //     link: 'management:index_management',
              //   },
              //   {
              //     title: i18n.translate(
              //       'navigation.searchNav.content.indices.searchGithub.pipelines',
              //       {
              //         defaultMessage: 'Pipelines',
              //       }
              //     ),
              //     link: 'management:ingest_pipelines',
              //   },
              // ],
            },
            { link: 'enterpriseSearchContent:connectors' },
            { link: 'enterpriseSearchContent:webCrawlers' },
          ],
          id: 'content',
          title: i18n.translate('navigation.searchNav.content', {
            defaultMessage: 'Content',
          }),
        },
        {
          children: [
            {
              link: 'enterpriseSearchApplications:playground',
            },
            {
              // TODO: Build the children dynamically
              // https://github.com/elastic/kibana/issues/179751
              // renderAs: 'accordion',
              // children: [
              //   {
              //     title: i18n.translate(
              //       'navigation.searchNav.build.searchApplications.docsExplorer',
              //       {
              //         defaultMessage: 'Docs explorer',
              //       }
              //     ),
              //     link: 'home',
              //   },
              //   {
              //     title: i18n.translate('navigation.searchNav.build.searchApplications.content', {
              //       defaultMessage: 'Content',
              //     }),
              //     link: 'home',
              //   },
              //   {
              //     title: i18n.translate('navigation.searchNav.build.searchApplications.connect', {
              //       defaultMessage: 'Connect',
              //     }),
              //     link: 'home',
              //   },
              // ],
              link: 'enterpriseSearchApplications:searchApplications',
              title: i18n.translate('navigation.searchNav.build.searchApplications', {
                defaultMessage: 'Search applications',
              }),
            },
            {
              link: 'enterpriseSearchAnalytics',
            },
          ],
          id: 'build',
          title: i18n.translate('navigation.searchNav.build', {
            defaultMessage: 'Build',
          }),
        },
        {
          children: [
            {
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.startsWith(prepend('/app/enterprise_search/app_search'));
              },
              link: 'appSearch:engines',
              title: i18n.translate('navigation.searchNav.entsearch.appSearch', {
                defaultMessage: 'App Search',
              }),
            },
            {
              link: 'workplaceSearch',
            },
          ],
          id: 'entsearch',
          title: i18n.translate('navigation.searchNav.entsearch', {
            defaultMessage: 'Enterprise Search',
          }),
        },
      ],
      defaultIsCollapsed: false,
      icon,
      id: 'search_project_nav',
      isCollapsible: false,
      title,
      type: 'navGroup',
    },
  ],
  footer: [
    {
      breadcrumbStatus: 'hidden',
      children: [
        {
          link: 'ml:modelManagement',
          title: i18n.translate('navigation.searchNav.management.trainedModels', {
            defaultMessage: 'Trained models',
          }),
        },
        {
          children: [
            {
              children: [{ link: 'management:ingest_pipelines' }, { link: 'management:pipelines' }],
              title: 'Ingest',
            },
            {
              children: [
                { link: 'management:index_management' },
                { link: 'management:index_lifecycle_management' },
                { link: 'management:snapshot_restore' },
                { link: 'management:rollup_jobs' },
                { link: 'management:transform' },
                { link: 'management:cross_cluster_replication' },
                { link: 'management:remote_clusters' },
                { link: 'management:migrate_data' },
              ],
              title: 'Data',
            },
            {
              children: [
                { link: 'management:triggersActions' },
                { link: 'management:cases' },
                { link: 'management:triggersActionsConnectors' },
                { link: 'management:reporting' },
                { link: 'management:jobsListLink' },
                { link: 'management:watcher' },
                { link: 'management:maintenanceWindows' },
              ],
              title: 'Alerts and Insights',
            },
            {
              children: [
                { link: 'management:users' },
                { link: 'management:roles' },
                { link: 'management:api_keys' },
                { link: 'management:role_mappings' },
              ],
              title: 'Security',
            },
            {
              children: [
                { link: 'management:dataViews' },
                { link: 'management:filesManagement' },
                { link: 'management:objects' },
                { link: 'management:tags' },
                { link: 'management:search_sessions' },
                { link: 'management:aiAssistantManagementSelection' },
                { link: 'management:spaces' },
                { link: 'management:settings' },
              ],
              title: 'Kibana',
            },
            {
              children: [
                { link: 'management:license_management' },
                { link: 'management:upgrade_assistant' },
              ],
              title: 'Stack',
            },
          ],
          link: 'management',
          renderAs: 'panelOpener',
          spaceBefore: null,
          title: i18n.translate('navigation.searchNav.mngt', {
            defaultMessage: 'Stack Management',
          }),
        },
      ],
      icon: 'gear',
      id: 'project_settings_project_nav',
      title: i18n.translate('navigation.searchNav.management', {
        defaultMessage: 'Management',
      }),
      type: 'navGroup',
    },
  ],
};

export const definition: SolutionNavigationDefinition = {
  homePage: 'enterpriseSearch',
  icon,
  id: 'es',
  navigationTree$: of(navTree),
  title,
};
