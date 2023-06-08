/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { ServerlessPluginStart } from '@kbn/serverless/public';
import {
  ChromeNavigationNodeViewModel,
  Navigation,
  NavigationKibanaProvider,
} from '@kbn/shared-ux-chrome-navigation';
import React from 'react';

// #TODO translate titles?
const navItems: ChromeNavigationNodeViewModel[] = [
  {
    id: 'services-infra',
    items: [
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
    items: [
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
    items: [
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
    items: [
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
    items: [
      {
        id: 'get-started',
        title: 'Get started',
        icon: 'launch',
        href: '/app/observabilityOnboarding',
      },
    ],
  },
];

export const getObservabilitySideNavComponent =
  (core: CoreStart, { serverless }: { serverless: ServerlessPluginStart }) =>
  () => {
    const activeNavItemId = 'observability_project_nav.root';

    return (
      <NavigationKibanaProvider core={core} serverless={serverless}>
        <Navigation
          navigationTree={[
            {
              id: 'observability_project_nav',
              items: navItems,
              title: 'Observability',
              icon: 'logoObservability',
            },
          ]}
          activeNavItemId={activeNavItemId}
          homeHref="/app/enterprise_search/content/setup_guide"
          linkToCloud="projects"
          platformConfig={{ devTools: { enabled: false } }}
        />
      </NavigationKibanaProvider>
    );
  };
