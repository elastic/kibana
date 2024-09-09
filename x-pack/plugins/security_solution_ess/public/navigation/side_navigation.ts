/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'rxjs';
import produce from 'immer';
import { i18n } from '@kbn/i18n';
import { SecurityPageName, SECURITY_UI_APP_ID } from '@kbn/security-solution-navigation';
import type { AppDeepLinkId, GroupDefinition, NodeDefinition } from '@kbn/core-chrome-browser';
import { type Services } from '../common/services';

export const SOLUTION_NAME = i18n.translate('xpack.securitySolutionEss.nav.solutionName', {
  defaultMessage: 'Security',
});

export const initSideNavigation = async (services: Services) => {
  const { securitySolution, navigation } = services;

  navigation.isSolutionNavEnabled$.subscribe((isSolutionNavigationEnabled) => {
    securitySolution.setIsSolutionNavigationEnabled(isSolutionNavigationEnabled);
  });

  const { navigationTree$, panelContentProvider } = await securitySolution.getSolutionNavigation();

  const essNavigationTree$ = navigationTree$.pipe(
    map((navigationTree) =>
      produce(navigationTree, (draft) => {
        if (draft.footer) {
          draft.footer.unshift({ type: 'recentlyAccessed' });
        }
        const footerGroup: GroupDefinition | undefined = draft.footer?.find(
          (node): node is GroupDefinition => node.type === 'navGroup'
        );
        const management = footerGroup?.children.find((child) => child.link === 'management');
        if (management) {
          management.renderAs = 'panelOpener';
          management.id = 'stack_management';
          management.spaceBefore = null;
          management.children = stackManagementLinks;
        }
      })
    )
  );

  navigation.addSolutionNavigation({
    id: 'security',
    homePage: `${SECURITY_UI_APP_ID}:${SecurityPageName.landing}`,
    title: SOLUTION_NAME,
    icon: 'logoSecurity',
    navigationTree$: essNavigationTree$,
    panelContentProvider,
    dataTestSubj: 'securitySolutionSideNav',
  });
};

// Temporary configuration to render the stack management links in the panel
const stackManagementLinks: Array<NodeDefinition<AppDeepLinkId, string, string>> = [
  {
    title: 'Ingest',
    children: [{ link: 'management:ingest_pipelines' }, { link: 'management:pipelines' }],
  },
  {
    title: 'Data',
    children: [
      { link: 'management:index_management' },
      { link: 'management:index_lifecycle_management' },
      { link: 'management:snapshot_restore' },
      { link: 'management:rollup_jobs' },
      { link: 'management:transform' },
      { link: 'management:cross_cluster_replication' },
      { link: 'management:remote_clusters' },
      { link: 'management:migrate_data' },
    ],
  },
  {
    title: 'Alerts and Insights',
    children: [
      { link: 'management:triggersActions' },
      { link: 'management:cases' },
      { link: 'management:triggersActionsConnectors' },
      { link: 'management:reporting' },
      { link: 'management:jobsListLink' },
      { link: 'management:watcher' },
      { link: 'management:maintenanceWindows' },
    ],
  },
  {
    title: 'Security',
    children: [
      { link: 'management:users' },
      { link: 'management:roles' },
      { link: 'management:api_keys' },
      { link: 'management:role_mappings' },
    ],
  },
  {
    title: 'Kibana',
    children: [
      { link: 'management:dataViews' },
      { link: 'management:filesManagement' },
      { link: 'management:objects' },
      { link: 'management:tags' },
      { link: 'management:search_sessions' },
      { link: 'management:aiAssistantManagementSelection' },
      { link: 'management:spaces' },
      { link: 'management:settings' },
    ],
  },
  {
    title: 'Stack',
    children: [{ link: 'management:license_management' }, { link: 'management:upgrade_assistant' }],
  },
];
