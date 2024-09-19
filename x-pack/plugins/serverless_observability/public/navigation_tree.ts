/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';

export const navigationTree: NavigationTreeDefinition = {
  body: [
    { type: 'recentlyAccessed' },
    {
      type: 'navGroup',
      id: 'observability_project_nav',
      title: 'Observability',
      icon: 'logoObservability',
      defaultIsCollapsed: false,
      isCollapsible: false,
      breadcrumbStatus: 'hidden',
      children: [
        {
          title: i18n.translate('xpack.serverlessObservability.nav.discover', {
            defaultMessage: 'Discover',
          }),
          link: 'observability-logs-explorer',
          // avoid duplicate "Discover" breadcrumbs
          breadcrumbStatus: 'hidden',
          renderAs: 'item',
          children: [
            {
              link: 'discover',
              children: [
                {
                  link: 'observability-logs-explorer',
                },
              ],
            },
          ],
        },
        {
          title: i18n.translate('xpack.serverlessObservability.nav.dashboards', {
            defaultMessage: 'Dashboards',
          }),
          link: 'dashboards',
          getIsActive: ({ pathNameSerialized, prepend }) => {
            return pathNameSerialized.startsWith(prepend('/app/dashboards'));
          },
        },
        {
          link: 'observability-overview:alerts',
        },
        {
          link: 'observability-overview:cases',
          renderAs: 'item',
          children: [
            {
              link: 'observability-overview:cases_configure',
            },
            {
              link: 'observability-overview:cases_create',
            },
          ],
        },
        {
          title: i18n.translate('xpack.serverlessObservability.nav.slo', {
            defaultMessage: 'SLOs',
          }),
          link: 'slo',
        },
        { link: 'inventory' },
        {
          id: 'aiops',
          title: 'AIOps',
          link: 'ml:anomalyDetection',
          renderAs: 'accordion',
          spaceBefore: null,
          children: [
            {
              title: i18n.translate('xpack.serverlessObservability.nav.ml.jobs', {
                defaultMessage: 'Anomaly detection',
              }),
              link: 'ml:anomalyDetection',
              id: 'ml:anomalyDetection',
              renderAs: 'item',
              children: [
                {
                  link: 'ml:singleMetricViewer',
                },
                {
                  link: 'ml:anomalyExplorer',
                },
                {
                  link: 'ml:settings',
                },
              ],
            },
            {
              title: i18n.translate('xpack.serverlessObservability.ml.logRateAnalysis', {
                defaultMessage: 'Log rate analysis',
              }),
              link: 'ml:logRateAnalysis',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.includes(prepend('/app/ml/aiops/log_rate_analysis'));
              },
            },
            {
              title: i18n.translate('xpack.serverlessObservability.ml.changePointDetection', {
                defaultMessage: 'Change point detection',
              }),
              link: 'ml:changePointDetections',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.includes(prepend('/app/ml/aiops/change_point_detection'));
              },
            },
            {
              title: i18n.translate('xpack.serverlessObservability.nav.ml.job.notifications', {
                defaultMessage: 'Job notifications',
              }),
              link: 'ml:notifications',
            },
          ],
        },
        {
          id: 'apm',
          title: i18n.translate('xpack.serverlessObservability.nav.applications', {
            defaultMessage: 'Applications',
          }),
          link: 'apm:services',
          renderAs: 'accordion',
          children: [
            {
              link: 'apm:services',
              getIsActive: ({ pathNameSerialized }) => {
                const regex = /app\/apm\/.*service.*/;
                return regex.test(pathNameSerialized);
              },
            },
            {
              link: 'apm:traces',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.startsWith(prepend('/app/apm/traces'));
              },
            },
            {
              link: 'apm:dependencies',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.startsWith(prepend('/app/apm/dependencies'));
              },
            },
            {
              link: 'apm:settings',
              sideNavStatus: 'hidden', // only to be considered in the breadcrumbs
            },
          ],
        },
        {
          id: 'metrics',
          title: i18n.translate('xpack.serverlessObservability.nav.infrastructure', {
            defaultMessage: 'Infrastructure',
          }),
          link: 'metrics:inventory',
          renderAs: 'accordion',
          children: [
            {
              link: 'metrics:inventory',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.startsWith(prepend('/app/metrics/inventory'));
              },
            },
            {
              link: 'metrics:hosts',
              getIsActive: ({ pathNameSerialized, prepend }) => {
                return pathNameSerialized.startsWith(prepend('/app/metrics/hosts'));
              },
            },
            {
              link: 'metrics:settings',
              sideNavStatus: 'hidden', // only to be considered in the breadcrumbs
            },
            {
              link: 'metrics:assetDetails',
              sideNavStatus: 'hidden', // only to be considered in the breadcrumbs
            },
          ],
        },
        {
          id: 'synthetics',
          title: i18n.translate('xpack.serverlessObservability.nav.synthetics', {
            defaultMessage: 'Synthetics',
          }),
          renderAs: 'accordion',
          breadcrumbStatus: 'hidden',
          children: [
            {
              title: i18n.translate('xpack.serverlessObservability.nav.synthetics.overviewItem', {
                defaultMessage: 'Overview',
              }),
              id: 'synthetics-overview',
              link: 'synthetics:overview',
              breadcrumbStatus: 'hidden',
            },
            {
              link: 'synthetics:certificates',
              title: i18n.translate(
                'xpack.serverlessObservability.nav.synthetics.certificatesItem',
                {
                  defaultMessage: 'TLS Certificates',
                }
              ),
              id: 'synthetics-certificates',
              breadcrumbStatus: 'hidden',
            },
          ],
        },
      ],
    },
  ],
  footer: [
    {
      type: 'navItem',
      title: i18n.translate('xpack.serverlessObservability.nav.getStarted', {
        defaultMessage: 'Add data',
      }),
      link: 'observabilityOnboarding',
      icon: 'launch',
    },
    {
      type: 'navItem',
      id: 'devTools',
      title: i18n.translate('xpack.serverlessObservability.nav.devTools', {
        defaultMessage: 'Developer tools',
      }),
      link: 'dev_tools',
      icon: 'editorCodeBlock',
    },
    {
      type: 'navGroup',
      id: 'project_settings_project_nav',
      title: i18n.translate('xpack.serverlessObservability.nav.projectSettings', {
        defaultMessage: 'Project settings',
      }),
      icon: 'gear',
      breadcrumbStatus: 'hidden',
      children: [
        {
          link: 'management',
          title: i18n.translate('xpack.serverlessObservability.nav.mngt', {
            defaultMessage: 'Management',
          }),
        },
        {
          link: 'integrations',
        },
        {
          link: 'fleet',
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
