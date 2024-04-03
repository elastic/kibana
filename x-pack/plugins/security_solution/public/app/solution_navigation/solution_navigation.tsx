/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { PanelContentProvider } from '@kbn/shared-ux-chrome-navigation';
import type { PanelComponentProps } from '@kbn/shared-ux-chrome-navigation/src/ui/components/panel/types';
import { SolutionSideNavPanelContent } from '@kbn/security-solution-side-nav/panel';
import useObservable from 'react-use/lib/useObservable';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import type { NavigationTreeDefinition } from '@kbn/core-chrome-browser';

import { NavigationProvider } from '@kbn/security-solution-navigation';
import type { CoreStart } from '@kbn/core/public';
// import type { CloudStart } from '@kbn/cloud-plugin/public';
import { usePanelSideNavItems } from './use_panel_side_nav_items';
import { CATEGORIES, FOOTER_CATEGORIES } from './categories';
import { formatNavigationTree } from './navigation_tree';
import type { SolutionNavLinks$ } from './types';
import { navLinks$ } from '../../common/links/nav_links';

export const withNavigationProvider = <T extends object>(
  Component: React.ComponentType<T>,
  core: CoreStart
) =>
  function WithNavigationProvider(props: T) {
    return (
      <NavigationProvider core={core}>
        <Component {...props} />
      </NavigationProvider>
    );
  };

const getPanelContentProvider = (
  core: CoreStart,
  solutionNavLinks$: SolutionNavLinks$
): React.FC<PanelComponentProps> => {
  const PanelContentProvider: React.FC<PanelComponentProps> = React.memo(
    function PanelContentProvider({ selectedNode: { id: linkId }, closePanel }) {
      const solutionNavLinks = useObservable(solutionNavLinks$, []);
      const currentPanelItem = solutionNavLinks.find((item) => item.id === linkId);

      const { title = '', links = [], categories } = currentPanelItem ?? {};
      const items = usePanelSideNavItems(links);

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
    }
  );

  return withNavigationProvider(PanelContentProvider, core);
};

export interface GetSolutionNavigation {
  navigationTree$: Observable<NavigationTreeDefinition>;
  panelContentProvider: PanelContentProvider;
  dataTestSubj: string;
}

export const getSolutionNavigation = (
  core: CoreStart
  // cloud: CloudStart // TODO: remove
  // solutionNavLinks$: SolutionNavLinks$
): GetSolutionNavigation => {
  // const solutionNavLinks$ = createSolutionNavLinks$(
  //   navLinks$,
  //   core
  //   // , cloud
  // );

  const panelContentProvider: PanelContentProvider = () => ({
    content: getPanelContentProvider(core, navLinks$),
  });

  const navigationTree$ = navLinks$.pipe(
    map((solutionNavLinks) => formatNavigationTree(solutionNavLinks, CATEGORIES, FOOTER_CATEGORIES))
  );

  return {
    navigationTree$,
    panelContentProvider,
    dataTestSubj: 'securitySolutionSideNav',
  };
};
