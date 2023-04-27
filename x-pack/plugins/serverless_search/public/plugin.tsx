/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  Navigation,
  NavigationKibanaProvider,
  NavItemProps,
} from '@kbn/shared-ux-chrome-navigation';
import React from 'react';
import {
  ServerlessSearchPluginSetup,
  ServerlessSearchPluginSetupDependencies,
  ServerlessSearchPluginStart,
  ServerlessSearchPluginStartDependencies,
} from './types';

const navItems: NavItemProps[] = [
  {
    name: '',
    id: 'root',
    items: [
      {
        id: 'overview',
        name: 'Overview',
        href: '/app/enterprise_search/overview',
      },
      {
        id: 'indices',
        name: 'Indices',
        href: '/app/enterprise_search/content/search_indices',
      },
      {
        id: 'engines',
        name: 'Engines',
        href: '/app/enterprise_search/content/engines',
      },
      {
        id: 'api_keys',
        name: 'API keys',
        href: '/app/management/security/api_keys',
      },
      {
        id: 'ingest_pipelines',
        name: 'Ingest pipelines',
        href: '/app/management/ingest/ingest_pipelines',
      },
    ],
  },
];
export class ServerlessSearchPlugin
  implements Plugin<ServerlessSearchPluginSetup, ServerlessSearchPluginStart>
{
  public setup(
    _core: CoreSetup,
    _setupDeps: ServerlessSearchPluginSetupDependencies
  ): ServerlessSearchPluginSetup {
    return {};
  }

  public start(
    core: CoreStart,
    { serverless }: ServerlessSearchPluginStartDependencies
  ): ServerlessSearchPluginStart {
    serverless.setServerlessNavigation(
      <NavigationKibanaProvider core={core}>
        <Navigation
          solutions={[
            {
              id: 'search_project_nav',
              items: navItems,
              name: 'Search',
              icon: 'logoEnterpriseSearch',
            },
          ]}
          activeNavItemId="search_project_nav.root.overview"
          platformConfig={{}}
          homeHref="/app/enterprise_search/content/setup_guide"
          linkToCloud="projects"
        />
      </NavigationKibanaProvider>
    );
    return {};
  }

  public stop() {}
}
