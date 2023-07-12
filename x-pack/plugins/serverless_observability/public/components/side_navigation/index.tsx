/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
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
              link: 'discover',
            },
            {
              title: i18n.translate('xpack.serverlessObservability.nav.dashboards', {
                defaultMessage: 'Dashboards',
              }),
              link: 'dashboards',
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
                },
                {
                  link: 'ml:changePointDetections',
                  icon: 'beaker',
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
              title: 'Applications',
              children: [
                {
                  link: 'apm:services',
                },
                {
                  link: 'apm:traces',
                },
                {
                  link: 'apm:dependencies',
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
      id: 'projest_settings_project_nav',
      title: 'Project settings',
      icon: 'gear',
      defaultIsCollapsed: true,
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
          ],
        },
      ],
    },
  ],
};

export const getObservabilitySideNavComponent =
  (core: CoreStart, { serverless }: { serverless: ServerlessPluginStart }) =>
  () => {
    return (
      <NavigationKibanaProvider core={core} serverless={serverless}>
        <DefaultNavigation navigationTree={navigationTree} dataTestSubj="svlObservabilitySideNav" />
      </NavigationKibanaProvider>
    );
  };
