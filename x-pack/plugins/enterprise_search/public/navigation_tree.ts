/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Observable, map, debounceTime } from 'rxjs';

import type { EuiSideNavItemType } from '@elastic/eui';
import type {
  NavigationTreeDefinition,
  NodeDefinition,
  EuiSideNavItemTypeEnhanced,
} from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

import type { AddSolutionNavigationArg } from '@kbn/navigation-plugin/public';

import { SEARCH_APPLICATIONS_PATH } from './applications/applications/routes';
import { SEARCH_INDICES_PATH } from './applications/enterprise_search_content/routes';

export interface DynamicSideNavItems {
  appSearch?: Array<EuiSideNavItemType<unknown>>;
  collections?: Array<EuiSideNavItemType<unknown>>;
  indices?: Array<EuiSideNavItemType<unknown>>;
  searchApps?: Array<EuiSideNavItemType<unknown>>;
  workplaceSearch?: Array<EuiSideNavItemType<unknown>>;
}

const title = i18n.translate(
  'xpack.enterpriseSearch.searchNav.headerSolutionSwitcher.searchSolutionTitle',
  {
    defaultMessage: 'Search',
  }
);
const icon = 'logoElasticsearch';

const euiItemTypeToNodeDefinition = ({
  items,
  href,
  iconToString,
  id,
  isSelected = false,
  name,
  nameToString,
  onClick,
}: EuiSideNavItemTypeEnhanced<unknown>): NodeDefinition => {
  const isAccordion = items !== undefined;

  const node: NodeDefinition = {
    children: isAccordion ? items.map(euiItemTypeToNodeDefinition) : undefined,
    getIsActive: () => isSelected,
    href,
    icon: iconToString,
    id: `${id}`,
    onClick: onClick
      ? (e) => {
          e.stopPropagation();
          onClick(e);
        }
      : undefined,
    title: typeof name === 'string' ? name : nameToString,
    ...(isAccordion ? { isCollapsible: false, renderAs: 'accordion' } : {}),
  };

  return node;
};

export const getNavigationTreeDefinition = ({
  dynamicItems$,
  isSearchHomepageEnabled,
}: {
  dynamicItems$: Observable<DynamicSideNavItems>;
  isSearchHomepageEnabled: boolean;
}): AddSolutionNavigationArg => {
  return {
    dataTestSubj: 'searchSideNav',
    homePage: isSearchHomepageEnabled ? 'searchHomepage' : 'enterpriseSearch',
    icon,
    id: 'es',
    navigationTree$: dynamicItems$.pipe(
      debounceTime(10),
      map(({ appSearch, indices, searchApps, collections, workplaceSearch }) => {
        const navTree: NavigationTreeDefinition = {
          body: [
            {
              breadcrumbStatus: 'hidden',
              children: [
                {
                  link: isSearchHomepageEnabled ? 'searchHomepage' : 'enterpriseSearch',
                },
                {
                  getIsActive: ({ pathNameSerialized, prepend }) => {
                    return pathNameSerialized.startsWith(prepend('/app/dev_tools'));
                  },
                  id: 'dev_tools',
                  link: 'dev_tools:console',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.devTools', {
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
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.kibana', {
                    defaultMessage: 'Kibana',
                  }),
                },
                {
                  children: [
                    {
                      getIsActive: ({ pathNameSerialized, prepend }) => {
                        const someSubItemSelected = indices?.some((index) =>
                          index.items?.some((item) => item.isSelected)
                        );

                        if (someSubItemSelected) return false;

                        return (
                          pathNameSerialized ===
                          prepend(`/app/enterprise_search/content${SEARCH_INDICES_PATH}`)
                        );
                      },
                      link: 'enterpriseSearchContent:searchIndices',
                      renderAs: 'item',
                      ...(indices
                        ? {
                            children: indices.map(euiItemTypeToNodeDefinition),
                            isCollapsible: false,
                            renderAs: 'accordion',
                          }
                        : {}),
                    },
                    { link: 'enterpriseSearchContent:connectors' },
                    { link: 'enterpriseSearchContent:webCrawlers' },
                  ],
                  id: 'content',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.content', {
                    defaultMessage: 'Content',
                  }),
                },
                {
                  children: [
                    {
                      link: 'enterpriseSearchApplications:playground',
                    },
                    {
                      getIsActive: ({ pathNameSerialized, prepend }) => {
                        const someSubItemSelected = searchApps?.some((app) =>
                          app.items?.some((item) => item.isSelected)
                        );

                        if (someSubItemSelected) return false;

                        return (
                          pathNameSerialized ===
                          prepend(`/app/enterprise_search/applications${SEARCH_APPLICATIONS_PATH}`)
                        );
                      },
                      link: 'enterpriseSearchApplications:searchApplications',
                      renderAs: 'item',
                      title: i18n.translate(
                        'xpack.enterpriseSearch.searchNav.build.searchApplications',
                        {
                          defaultMessage: 'Search applications',
                        }
                      ),
                      ...(searchApps
                        ? {
                            children: searchApps.map(euiItemTypeToNodeDefinition),
                            isCollapsible: false,
                            renderAs: 'accordion',
                          }
                        : {}),
                    },
                    {
                      getIsActive: ({ pathNameSerialized, prepend }) => {
                        const someSubItemSelected = collections?.some((collection) =>
                          collection.items?.some((item) => item.isSelected)
                        );

                        if (someSubItemSelected) return false;

                        return pathNameSerialized === prepend(`/app/enterprise_search/analytics`);
                      },
                      link: 'enterpriseSearchAnalytics',
                      renderAs: 'item',
                      ...(collections
                        ? {
                            children: collections.map(euiItemTypeToNodeDefinition),
                            isCollapsible: false,
                            renderAs: 'accordion',
                          }
                        : {}),
                    },
                  ],
                  id: 'build',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.build', {
                    defaultMessage: 'Build',
                  }),
                },
                {
                  children: [{ link: 'searchInferenceEndpoints' }],
                  id: 'relevance',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.relevance', {
                    defaultMessage: 'Relevance',
                  }),
                },
                {
                  children: [
                    {
                      getIsActive: () => false,
                      link: 'appSearch:engines',
                      title: i18n.translate(
                        'xpack.enterpriseSearch.searchNav.entsearch.appSearch',
                        {
                          defaultMessage: 'App Search',
                        }
                      ),
                      ...(appSearch
                        ? {
                            children: appSearch.map(euiItemTypeToNodeDefinition),
                            isCollapsible: false,
                            renderAs: 'accordion',
                          }
                        : {}),
                    },
                    {
                      getIsActive: () => false,
                      link: 'workplaceSearch',
                      ...(workplaceSearch
                        ? {
                            children: workplaceSearch.map(euiItemTypeToNodeDefinition),
                            isCollapsible: false,
                            renderAs: 'accordion',
                          }
                        : {}),
                    },
                  ],
                  id: 'entsearch',
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.entsearch', {
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
            { type: 'recentlyAccessed' },
            {
              breadcrumbStatus: 'hidden',
              children: [
                {
                  link: 'ml:modelManagement',
                  title: i18n.translate(
                    'xpack.enterpriseSearch.searchNav.management.trainedModels',
                    {
                      defaultMessage: 'Trained models',
                    }
                  ),
                },
                {
                  children: [
                    {
                      children: [
                        { link: 'management:ingest_pipelines' },
                        { link: 'management:pipelines' },
                      ],
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
                  title: i18n.translate('xpack.enterpriseSearch.searchNav.mngt', {
                    defaultMessage: 'Stack Management',
                  }),
                },
              ],
              icon: 'gear',
              id: 'project_settings_project_nav',
              title: i18n.translate('xpack.enterpriseSearch.searchNav.management', {
                defaultMessage: 'Management',
              }),
              type: 'navGroup',
            },
          ],
        };

        return navTree;
      })
    ),
    title,
  };
};
