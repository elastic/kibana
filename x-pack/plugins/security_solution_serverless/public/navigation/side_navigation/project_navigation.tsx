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

import { withServicesProvider, type Services } from '../../common/services';
import { usePanelSideNavItems } from './use_panel_side_nav_items';
import { CATEGORIES, FOOTER_CATEGORIES } from '../categories';
import { formatNavigationTree } from './navigation_tree';

const getPanelContentProvider = (services: Services): React.FC<PanelComponentProps> => {
  const projectNavLinks$ = services.getProjectNavLinks$();

  const Comp: React.FC<PanelComponentProps> = React.memo(function PanelContentProvider({
    selectedNode: { id: linkId },
    closePanel,
  }) {
    const projectNavLinks = useObservable(projectNavLinks$, []);
    const currentPanelItem = projectNavLinks.find((item) => item.id === linkId);

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
  });

  return withServicesProvider(Comp, services);
};

export const init = (
  services: Services
): {
  navigationTree$: Observable<NavigationTreeDefinition>;
  panelContentProvider: PanelContentProvider;
  dataTestSubj: string;
} => {
  const panelContentProvider: PanelContentProvider = () => ({
    content: getPanelContentProvider(services),
  });

  const navigationTree$ = services
    .getProjectNavLinks$()
    .pipe(
      map((projectNavLinks) => formatNavigationTree(projectNavLinks, CATEGORIES, FOOTER_CATEGORIES))
    );

  return {
    navigationTree$,
    panelContentProvider,
    dataTestSubj: 'securitySolutionSideNav',
  };
};
