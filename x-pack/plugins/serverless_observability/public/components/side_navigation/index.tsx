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
      breadcrumbStatus: 'hidden',
      children: [
        {
          id: 'discover-dashboard-alerts-slos',
          children: [
            {
              title: i18n.translate('xpack.serverlessObservability.nav.discover', {
                defaultMessage: 'Discover',
              }),
              link: 'discover:log-explorer',
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
              link: 'observability-overview:slos',
            },
            {
              id: 'aiops',
              title: 'AIOps',
              children: [
                {
                  title: i18n.translate('xpack.serverlessObservability.nav.ml.jobs', {
                    defaultMessage: 'Anomaly detection',
                  }),
                  link: 'ml:anomalyDetection',
                },
                {
                  title: i18n.translate('xpack.serverlessObservability.ml.logRateAnalysis', {
                    defaultMessage: 'Log rate analysis',
                  }),
                  link: 'ml:logRateAnalysis',
                  icon: 'beaker',
                  getIsActive: ({ pathNameSerialized, prepend }) => {
                    return pathNameSerialized.includes(prepend('/app/ml/aiops/log_rate_analysis'));
                  },
                },
                {
                  link: 'ml:changePointDetections',
                  icon: 'beaker',
                  getIsActive: ({ pathNameSerialized, prepend }) => {
                    return pathNameSerialized.includes(
                      prepend('/app/ml/aiops/change_point_detection')
                    );
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
          ],
        },
        {
          id: 'applications',
          children: [
            {
              id: 'apm',
              title: i18n.translate('xpack.serverlessObservability.nav.applications', {
                defaultMessage: 'Applications',
              }),
              children: [
                {
                  link: 'apm:services',
                  getIsActive: ({ pathNameSerialized, prepend }) => {
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
          ],
        },
        {
          id: 'cases-vis',
          children: [
            {
              link: 'observability-overview:cases',
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
          ],
        },
        {
          id: 'on-boarding',
          children: [
            {
              title: i18n.translate('xpack.serverlessObservability.nav.getStarted', {
                defaultMessage: 'Add data',
              }),
              link: 'observabilityOnboarding',
            },
          ],
        },
      ],
    },
  ],
  footer: [
    {
      type: 'navGroup',
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
          id: 'settings',
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
