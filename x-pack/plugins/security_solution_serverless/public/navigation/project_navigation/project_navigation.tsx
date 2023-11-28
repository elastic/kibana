/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { DefaultNavigation, NavigationKibanaProvider } from '@kbn/shared-ux-chrome-navigation';
import type {
  ContentProvider,
  PanelComponentProps,
} from '@kbn/shared-ux-chrome-navigation/src/ui/components/panel/types';
import { SolutionSideNavPanelContent } from '@kbn/security-solution-side-nav/panel';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../../common/services';
import type { ProjectNavigationLink } from '../links/types';
import { useFormattedSideNavItems } from '../side_navigation/use_side_nav_items';
import { CATEGORIES, FOOTER_CATEGORIES } from '../categories';
import { formatNavigationTree } from '../navigation_tree/navigation_tree';

const getPanelContentProvider = (
  projectNavLinks: ProjectNavigationLink[]
): React.FC<PanelComponentProps> =>
  React.memo(function PanelContentProvider({ selectedNode: { id: linkId }, closePanel }) {
    const currentPanelItem = projectNavLinks.find((item) => item.id === linkId);

    const { title = '', links = [], categories } = currentPanelItem ?? {};
    const items = useFormattedSideNavItems(links);

    if (items.length === 0) {
      return null;
    }
    return (
      <SolutionSideNavPanelContent
        title={title}
        items={items}
        categories={categories}
        onClose={closePanel}
      />
    );
  });

const usePanelContentProvider = (projectNavLinks: ProjectNavigationLink[]): ContentProvider => {
  return useCallback(
    () => ({
      content: getPanelContentProvider(projectNavLinks),
    }),
    [projectNavLinks]
  );
};

export const SecuritySideNavComponent = React.memo(function SecuritySideNavComponent() {
  const services = useKibana().services;
  const projectNavLinks = useObservable(services.getProjectNavLinks$(), []);

  const navigationTree = useMemo(
    () => formatNavigationTree(projectNavLinks, CATEGORIES, FOOTER_CATEGORIES),
    [projectNavLinks]
  );

  const panelContentProvider = usePanelContentProvider(projectNavLinks);

  return (
    <NavigationKibanaProvider
      core={services}
      serverless={services.serverless}
      cloud={services.cloud}
    >
      <DefaultNavigation
        dataTestSubj="securitySolutionSideNav"
        navigationTree={navigationTree}
        panelContentProvider={panelContentProvider}
      />
    </NavigationKibanaProvider>
  );
});

// eslint-disable-next-line import/no-default-export
export default SecuritySideNavComponent;
