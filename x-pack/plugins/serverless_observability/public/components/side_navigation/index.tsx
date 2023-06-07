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

const navigationTree: NavigationTreeDefinition = {
  body: [
    { type: 'cloudLink', preset: 'projects' },
    { type: 'recentlyAccessed' },
    {
      type: 'navGroup',
      id: 'observability_project_nav',
      title: 'Observability',
      icon: 'logoObservability',
      defaultIsCollapsed: false,
      children: [
        {
          id: 'services-infra',
          children: [
            { id: 'services', title: 'Services', href: '/app/apm/services' },
            {
              id: 'infra',
              title: 'Infrastructure',
              href: '/app/metrics/inventory',
            },
          ],
        },
        {
          id: 'alerts-cases-slos',
          children: [
            {
              id: 'alerts',
              title: 'Alerts',
              href: '/app/observability/alerts',
            },
            {
              id: 'Cases',
              title: 'Cases',
              href: '/app/observability/cases',
            },
            {
              id: 'slos',
              title: 'SLOs',
              href: '/app/observability/slos',
            },
          ],
        },
        {
          id: 'signals',
          title: 'Signals',
          children: [
            {
              id: 'traces',
              title: 'Traces',
              href: '/app/apm/traces',
            },
            {
              id: 'logs',
              title: 'Logs',
              href: '/app/logs/stream',
            },
          ],
        },
        {
          id: 'toolbox',
          title: 'Toolbox',
          children: [
            {
              id: 'visualization',
              title: 'Visualization',
              href: '/app/visualize',
            },
            {
              id: 'dashboards',
              title: 'Dashboards',
              href: '/app/dashboards',
            },
          ],
        },
        {
          id: 'on-boarding',
          children: [
            {
              id: 'get-started',
              title: 'Get started',
              icon: 'launch',
              href: '/app/observabilityOnboarding',
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
        <DefaultNavigation
          homeRef="/app/enterprise_search/content/setup_guide"
          navigationTree={navigationTree}
          dataTestSubj="svlObservabilitySideNav"
        />
      </NavigationKibanaProvider>
    );
  };
