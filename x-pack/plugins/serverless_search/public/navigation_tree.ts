/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLinkId, NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { i18n } from '@kbn/i18n';
import { CONNECTORS_LABEL } from '../common/i18n_string';

export const navigationTree = ({ isAppRegistered }: ApplicationStart): NavigationTreeDefinition => {
  function isAvailable<T>(appId: string, content: T): T[] {
    return isAppRegistered(appId) ? [content] : [];
  }

  return {
    body: [
      {
        type: 'navGroup',
        id: 'search_project_nav',
        title: 'Elasticsearch',
        icon: 'logoElasticsearch',
        defaultIsCollapsed: false,
        isCollapsible: false,
        breadcrumbStatus: 'hidden',
        children: [
          {
            id: 'data',
            title: i18n.translate('xpack.serverlessSearch.nav.data', {
              defaultMessage: 'Data',
            }),
            spaceBefore: 'm',
            children: [
              {
                title: i18n.translate('xpack.serverlessSearch.nav.content.indices', {
                  defaultMessage: 'Index Management',
                }),
                link: 'management:index_management',
                breadcrumbStatus:
                  'hidden' /* management sub-pages set their breadcrumbs themselves */,
                getIsActive: ({ pathNameSerialized, prepend }) => {
                  return (
                    pathNameSerialized.startsWith(
                      prepend('/app/management/data/index_management/')
                    ) ||
                    pathNameSerialized.startsWith(prepend('/app/elasticsearch/indices')) ||
                    pathNameSerialized.startsWith(prepend('/app/elasticsearch/start'))
                  );
                },
              },
              {
                title: CONNECTORS_LABEL,
                link: 'serverlessConnectors',
              },
            ],
          },
          {
            id: 'build',
            title: i18n.translate('xpack.serverlessSearch.nav.build', {
              defaultMessage: 'Build',
            }),
            spaceBefore: 'm',
            children: [
              {
                id: 'dev_tools',
                title: i18n.translate('xpack.serverlessSearch.nav.devTools', {
                  defaultMessage: 'Dev Tools',
                }),
                link: 'dev_tools',
                getIsActive: ({ pathNameSerialized, prepend }) => {
                  return pathNameSerialized.startsWith(prepend('/app/dev_tools'));
                },
              },
              ...isAvailable('searchPlayground', {
                id: 'searchPlayground',
                title: i18n.translate('xpack.serverlessSearch.nav.build.searchPlayground', {
                  defaultMessage: 'Playground',
                }),
                link: 'searchPlayground' as AppDeepLinkId,
              }),
            ],
          },
          {
            id: 'relevance',
            title: i18n.translate('xpack.serverlessSearch.nav.relevance', {
              defaultMessage: 'Relevance',
            }),
            spaceBefore: 'm',
            children: [
              {
                id: 'searchInferenceEndpoints',
                title: i18n.translate(
                  'xpack.serverlessSearch.nav.relevance.searchInferenceEndpoints',
                  {
                    defaultMessage: 'Inference Endpoints',
                  }
                ),
                link: 'searchInferenceEndpoints',
              },
            ],
          },
          {
            id: 'analyze',
            title: i18n.translate('xpack.serverlessSearch.nav.analyze', {
              defaultMessage: 'Analyze',
            }),
            spaceBefore: 'm',
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
            ],
          },
          {
            id: 'otherTools',
            title: i18n.translate('xpack.serverlessSearch.nav.otherTools', {
              defaultMessage: 'Other tools',
            }),
            spaceBefore: 'm',
            children: [{ link: 'maps' }],
          },
        ],
      },
    ],
    footer: [
      {
        id: 'gettingStarted',
        type: 'navItem',
        title: i18n.translate('xpack.serverlessSearch.nav.gettingStarted', {
          defaultMessage: 'Getting Started',
        }),
        link: 'serverlessElasticsearch',
        icon: 'launch',
      },
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
            link: 'ml:modelManagement',
            title: i18n.translate('xpack.serverlessSearch.nav.trainedModels', {
              defaultMessage: 'Trained models',
            }),
          },
          {
            link: 'management',
            title: i18n.translate('xpack.serverlessSearch.nav.mngt', {
              defaultMessage: 'Management',
            }),
          },
          {
            id: 'cloudLinkUserAndRoles',
            cloudLink: 'userAndRoles',
          },
          {
            id: 'cloudLinkDeployment',
            cloudLink: 'deployment',
            title: i18n.translate('xpack.serverlessSearch.nav.performance', {
              defaultMessage: 'Performance',
            }),
          },
          {
            id: 'cloudLinkBilling',
            cloudLink: 'billingAndSub',
          },
        ],
      },
    ],
  };
};
