/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';

export const createNavigationTree = (): NavigationTreeDefinition => {
  return {
    body: [
      {
        type: 'navGroup',
        id: 'workchat_project_nav',
        title: 'Workchat',
        icon: 'logoElasticsearch',
        defaultIsCollapsed: false,
        isCollapsible: false,
        breadcrumbStatus: 'hidden',
        children: [
          {
            link: 'workchat',
            title: 'Home',
          },
          {
            link: 'discover',
            spaceBefore: 'l',
          },
          {
            link: 'dashboards',
            getIsActive: ({ pathNameSerialized, prepend }) => {
              return pathNameSerialized.startsWith(prepend('/app/dashboards'));
            },
          },
          {
            link: 'workchat:agents',
            spaceBefore: 'l',
          },
          {
            link: 'workchat:integrations',
          },
        ],
      },
    ],
    footer: [
      {
        type: 'navGroup',
        id: 'workchat_project_nav_footer',
        children: [
          {
            id: 'devTools',
            title: i18n.translate('xpack.serverlessObservability.nav.devTools', {
              defaultMessage: 'Developer tools',
            }),
            link: 'dev_tools',
            icon: 'editorCodeBlock',
          },
          {
            id: 'project_settings_project_nav',
            title: i18n.translate('xpack.serverlessObservability.nav.projectSettings', {
              defaultMessage: 'Project settings',
            }),
            icon: 'gear',
            breadcrumbStatus: 'hidden',
            renderAs: 'accordion',
            spaceBefore: null,
            children: [
              {
                id: 'management',
                title: i18n.translate('xpack.serverlessObservability.nav.mngt', {
                  defaultMessage: 'Management',
                }),
                renderAs: 'panelOpener',
                children: [
                  {
                    title: i18n.translate('xpack.serverlessObservability.nav.mngt.data', {
                      defaultMessage: 'Data',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [
                      { link: 'management:index_management', breadcrumbStatus: 'hidden' },
                      { link: 'management:transform', breadcrumbStatus: 'hidden' },
                      { link: 'management:ingest_pipelines', breadcrumbStatus: 'hidden' },
                      { link: 'management:dataViews', breadcrumbStatus: 'hidden' },
                      { link: 'management:jobsListLink', breadcrumbStatus: 'hidden' },
                      { link: 'management:pipelines', breadcrumbStatus: 'hidden' },
                      { link: 'management:data_quality', breadcrumbStatus: 'hidden' },
                      { link: 'management:data_usage', breadcrumbStatus: 'hidden' },
                    ],
                  },
                  {
                    title: i18n.translate('xpack.serverlessObservability.nav.mngt.access', {
                      defaultMessage: 'Access',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [{ link: 'management:api_keys', breadcrumbStatus: 'hidden' }],
                  },
                  {
                    title: i18n.translate(
                      'xpack.serverlessObservability.nav.mngt.alertsAndInsights',
                      {
                        defaultMessage: 'Alerts and insights',
                      }
                    ),
                    breadcrumbStatus: 'hidden',
                    children: [
                      { link: 'management:triggersActionsConnectors', breadcrumbStatus: 'hidden' },
                      { link: 'management:maintenanceWindows', breadcrumbStatus: 'hidden' },
                    ],
                  },
                  {
                    title: i18n.translate('xpack.serverlessObservability.nav.mngt.content', {
                      defaultMessage: 'Content',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [
                      { link: 'management:spaces', breadcrumbStatus: 'hidden' },
                      { link: 'management:objects', breadcrumbStatus: 'hidden' },
                      { link: 'management:filesManagement', breadcrumbStatus: 'hidden' },
                      { link: 'management:reporting', breadcrumbStatus: 'hidden' },
                      { link: 'management:tags', breadcrumbStatus: 'hidden' },
                    ],
                  },
                  {
                    title: i18n.translate('xpack.serverlessObservability.nav.mngt.other', {
                      defaultMessage: 'Other',
                    }),
                    breadcrumbStatus: 'hidden',
                    children: [
                      { link: 'management:settings', breadcrumbStatus: 'hidden' },
                      {
                        link: 'management:observabilityAiAssistantManagement',
                        breadcrumbStatus: 'hidden',
                      },
                    ],
                  },
                ],
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
};
