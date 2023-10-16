/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { DefaultNavigation, NavigationKibanaProvider } from '@kbn/shared-ux-chrome-navigation';
import type {
  ContentProvider,
  PanelComponentProps,
} from '@kbn/shared-ux-chrome-navigation/src/ui/components/panel/types';
import { SolutionSideNavPanelContent } from '@kbn/security-solution-side-nav/panel';
import useObservable from 'react-use/lib/useObservable';
import type { LinkCategory } from '@kbn/security-solution-navigation';
import { useKibana } from '../common/services';
import type { ProjectNavigationLink, ProjectPageName } from './links/types';
import { processCloudLinks } from './links/nav_links';
import { useFormattedSideNavItems } from './side_navigation/use_side_nav_items';
import { CATEGORIES } from './side_navigation/categories';
import { formatNavigationTree } from './navigation_tree/navigation_tree';

const projectCategories = CATEGORIES as Array<LinkCategory<ProjectPageName>>;

const usePanelContentProvider = (projectNavLinks: ProjectNavigationLink[]): ContentProvider => {
  const PanelContent: React.FC<PanelComponentProps> = ({ selectedNode: { path }, closePanel }) => {
    const { cloud } = useKibana().services;
    const linkId = path[path.length - 1] as ProjectPageName;
    const currentPanelItem = projectNavLinks.find((item) => item.id === linkId);

    const { title = '', links = [], categories } = currentPanelItem ?? {};
    const panelLinks = processCloudLinks(links, cloud);
    const items = useFormattedSideNavItems(panelLinks);

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
  };
  return () => ({
    title: 'Custom panel title',
    content: PanelContent,
  });
};

export const SecuritySideNavComponent = React.memo(function SecuritySideNavComponent() {
  const services = useKibana().services;
  const projectNavLinks = useObservable(services.getProjectNavLinks$(), []);

  const navigationTree = useMemo(
    () => formatNavigationTree(projectNavLinks, projectCategories),
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
