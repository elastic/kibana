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
          id: 'services-infra',
          children: [
            { link: 'apm:services' },
            {
              title: i18n.translate('xpack.serverlessObservability.nav.infrastructure', {
                defaultMessage: 'Infrastructure',
              }),
              link: 'metrics:inventory',
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
          id: 'signals',
          title: 'Signals',
          children: [
            {
              link: 'apm:traces',
            },
            {
              title: i18n.translate('xpack.serverlessObservability.nav.signalsLogs', {
                defaultMessage: 'Logs',
              }),
              link: 'logs:stream',
            },
          ],
        },
        {
          id: 'toolbox',
          title: 'Toolbox',
          children: [
            {
              title: i18n.translate('xpack.serverlessObservability.nav.toolBoxVisualization', {
                defaultMessage: 'Visualization',
              }),
              link: 'visualize',
            },
            {
              link: 'dashboards',
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
      ...getPresets('analytics'),
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
