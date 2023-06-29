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
  getPresets,
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
          id: 'discover-dashboard-viz',
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
              title: i18n.translate('xpack.serverlessObservability.nav.visualizations', {
                defaultMessage: 'Visualizations',
              }),
              link: 'visualize',
            },
          ],
        },
        {
          id: 'alerts-cases-slos',
          children: [
            {
              link: 'observability-overview:alerts',
            },
            {
              link: 'observability-overview:cases',
            },
            {
              link: 'observability-overview:slos',
            },
          ],
        },
        {
          id: 'apm',
          title: 'APM',
          children: [
            { link: 'apm:services' },
            {
              link: 'apm:traces',
            },
            {
              title: i18n.translate('xpack.serverlessObservability.nav.logs', {
                defaultMessage: 'Logs',
              }),
              link: 'logs:stream',
            },
            {
              link: 'apm:dependencies',
            },
          ],
        },
        {
          id: 'on-boarding',
          children: [
            {
              title: i18n.translate('xpack.serverlessObservability.nav.getStarted', {
                defaultMessage: 'Get started',
              }),
              icon: 'launch',
              link: 'observabilityOnboarding',
            },
          ],
        },
      ],
    },
    {
      type: 'navGroup',
      ...getPresets('ml'),
    },
  ],
  footer: [
    {
      type: 'navGroup',
      ...getPresets('management'),
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
