/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useKibana } from '../../lib/kibana';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import { useSetBreadcrumbs } from './breadcrumbs';
import { TabNavigation } from './tab_navigation';
import type { SecuritySolutionTabNavigationProps } from './types';

export function TabNavigationWithBreadcrumbs({
  navTabs,
  display,
}: SecuritySolutionTabNavigationProps): JSX.Element {
  const [routeState] = useRouteSpy();
  const {
    chrome,
    application: { getUrlForApp, navigateToUrl },
  } = useKibana().services;
  const setBreadcrumbs = useSetBreadcrumbs();

  useEffect(() => {
    if (!routeState.pathName && !routeState.pageName) {
      return;
    }

    setBreadcrumbs({ ...routeState, navTabs }, chrome, navigateToUrl);
  }, [chrome, routeState, navTabs, getUrlForApp, navigateToUrl, setBreadcrumbs]);

  return (
    <TabNavigation
      display={display}
      navTabs={navTabs}
      pageName={routeState.pageName}
      pathName={routeState.pathName}
      tabName={routeState.tabName}
    />
  );
}

TabNavigationWithBreadcrumbs.displayName = 'TabNavigationWithBreadcrumbs';
