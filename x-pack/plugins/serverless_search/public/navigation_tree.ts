/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { CONNECTORS_LABEL } from '../common/i18n_string';

export const navigationTree: NavigationTreeDefinition = {
  body: [
    { type: 'recentlyAccessed' },
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
          id: 'home',
          title: i18n.translate('xpack.serverlessSearch.nav.home', {
            defaultMessage: 'Home',
          }),
          link: 'serverlessElasticsearch',
          spaceBefore: 'm',
        },
        {
          id: 'dev_tools',
          title: i18n.translate('xpack.serverlessSearch.nav.devTools', {
            defaultMessage: 'Dev Tools',
          }),
          link: 'dev_tools:console',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.startsWith(prepend('/app/dev_tools'));
          },
          spaceBefore: 'm',
        },
        {
          link: 'discover',
          spaceBefore: 'm',
        },
        {
          link: 'dashboards',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.startsWith(prepend('/app/dashboards'));
          },
        },
        {
          link: 'visualize',
          title: i18n.translate('xpack.serverlessSearch.nav.visualize', {
            defaultMessage: 'Visualizations',
          }),
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
        {
          title: i18n.translate('xpack.serverlessSearch.nav.content.indices', {
            defaultMessage: 'Index Management',
          }),
          link: 'management:index_management',
          breadcrumbStatus: 'hidden' /* management sub-pages set their breadcrumbs themselves */,
          spaceBefore: 'm',
        },
        {
          title: i18n.translate('xpack.serverlessSearch.nav.content.pipelines', {
            defaultMessage: 'Pipelines',
          }),
          link: 'management:ingest_pipelines',
          breadcrumbStatus: 'hidden' /* management sub-pages set their breadcrumbs themselves */,
        },
        {
          title: CONNECTORS_LABEL,
          link: 'serverlessConnectors',
        },
        {
          link: 'management:api_keys',
          breadcrumbStatus: 'hidden' /* management sub-pages set their breadcrumbs themselves */,
          spaceBefore: 'm',
        },
      ],
    },
  ],
  footer: [
    {
      type: 'navItem',
      id: 'search_getting_started',
      title: i18n.translate('xpack.serverlessSearch.nav.gettingStarted', {
        defaultMessage: 'Get started',
      }),
      icon: 'launch',
      link: 'serverlessElasticsearch',
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
};
