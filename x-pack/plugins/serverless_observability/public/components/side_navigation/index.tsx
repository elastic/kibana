/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { ServerlessPluginStart } from '@kbn/serverless/public';
import {
  DefaultNavigation,
  NavigationKibanaProvider,
  NavigationTreeDefinition,
} from '@kbn/shared-ux-chrome-navigation';
import React from 'react';
import { i18n } from '@kbn/i18n';

const navigationTree: NavigationTreeDefinition = {
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
          title: i18n.translate('xpack.serverlessObservability.nav.logExplorer', {
            defaultMessage: 'Log Explorer',
          }),
          link: 'observability-log-explorer',
          renderAs: 'item',
          children: [
            {
              // This is to show "discover" breadcrumbs when navigating from "log explorer" to "discover"
              link: 'discover',
              sideNavStatus: 'hidden',
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
          title: i18n.translate('xpack.serverlessObservability.nav.visualizations', {
            defaultMessage: 'Visualizations',
          }),
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
          link: 'observability-overview:slos',
        },
        {
          id: 'aiops',
          title: 'AIOps',
          renderAs: 'accordion',
          spaceBefore: null,
          children: [
            {
              title: i18n.translate('xpack.serverlessObservability.nav.ml.jobs', {
                defaultMessage: 'Anomaly detection',
              }),
              link: 'ml:anomalyDetection',
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
          ],
        },
        {
          id: 'metrics',
          title: i18n.translate('xpack.serverlessObservability.nav.infrastructure', {
            defaultMessage: 'Infrastructure',
          }),
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
          ],
        },
      ],
    },
  ],
  footer: [
    {
      type: 'navItem',
      title: i18n.translate('xpack.serverlessObservability.nav.getStarted', {
        defaultMessage: 'Get started',
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

export const getObservabilitySideNavComponent =
  (
    core: CoreStart,
    { serverless, cloud }: { serverless: ServerlessPluginStart; cloud: CloudStart }
  ) =>
  () => {
    return (
      <NavigationKibanaProvider core={core} serverless={serverless} cloud={cloud}>
        <DefaultNavigation navigationTree={navigationTree} dataTestSubj="svlObservabilitySideNav" />
      </NavigationKibanaProvider>
    );
  };
