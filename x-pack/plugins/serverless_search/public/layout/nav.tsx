/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import {
  ChromeNavigationNodeViewModel,
  Navigation,
  NavigationKibanaProvider,
} from '@kbn/shared-ux-chrome-navigation';
import React from 'react';

const navItems: ChromeNavigationNodeViewModel[] = [
  {
    title: '',
    id: 'root',
    items: [
      { id: 'overview', title: 'Overview', href: '/app/enterprise_search/overview' },
      { id: 'indices', title: 'Indices', href: '/app/enterprise_search/content/search_indices' },
      { id: 'engines', title: 'Engines', href: '/app/enterprise_search/content/engines' },
      { id: 'api_keys', title: 'API keys', href: '/app/management/security/api_keys' },
      {
        id: 'ingest_pipelines',
        title: 'Ingest pipelines',
        href: '/app/management/ingest/ingest_pipelines',
      },
    ],
  },
];

export const createServerlessSearchSideNavComponent = (core: CoreStart) => () => {
  // Currently, this allows the "Search" section of the side nav to render as pre-expanded.
  // This will soon be powered from state received from core.chrome
  const activeNavItemId = 'search_project_nav.root';

  return (
    <NavigationKibanaProvider core={core}>
      <Navigation
        navigationTree={[
          {
            id: 'search_project_nav',
            items: navItems,
            title: 'Search',
            icon: 'logoEnterpriseSearch',
          },
        ]}
        activeNavItemId={activeNavItemId}
        homeHref="/app/enterprise_search/content/setup_guide"
        linkToCloud="projects"
      />
    </NavigationKibanaProvider>
  );
};
