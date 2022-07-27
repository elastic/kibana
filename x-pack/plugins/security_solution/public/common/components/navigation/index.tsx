/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import deepEqual from 'fast-deep-equal';

import { useKibana } from '../../lib/kibana';
import type { RouteSpyState } from '../../utils/route/types';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import { useSetBreadcrumbs } from './breadcrumbs';
import { TabNavigation } from './tab_navigation';
import type { TabNavigationComponentProps, SecuritySolutionTabNavigationProps } from './types';

/**
 * @description - This component handels all of the tab navigation seen within a Security Soluton application page, not the Security Solution primary side navigation
 * For the primary side nav see './use_security_solution_navigation'
 */
export const TabNavigationComponent: React.FC<
  RouteSpyState & SecuritySolutionTabNavigationProps & TabNavigationComponentProps
> = React.memo(
  ({ detailName, display, flowTarget, navTabs, pageName, pathName, search, state, tabName }) => {
    const {
      chrome,
      application: { getUrlForApp, navigateToUrl },
    } = useKibana().services;

    const setBreadcrumbs = useSetBreadcrumbs();

    useEffect(() => {
      if (pathName || pageName) {
        setBreadcrumbs(
          {
            detailName,
            flowTarget,
            navTabs,
            pageName,
            pathName,
            search,
            state,
            tabName,
          },
          chrome,
          navigateToUrl
        );
      }
    }, [
      chrome,
      pageName,
      pathName,
      search,
      navTabs,
      state,
      detailName,
      flowTarget,
      tabName,
      getUrlForApp,
      navigateToUrl,
      setBreadcrumbs,
    ]);

    return (
      <TabNavigation
        display={display}
        navTabs={navTabs}
        pageName={pageName}
        pathName={pathName}
        tabName={tabName}
      />
    );
  }
);
TabNavigationComponent.displayName = 'TabNavigationComponent';

export const SecuritySolutionTabNavigationRedux = React.memo(
  TabNavigationComponent,
  (prevProps, nextProps) =>
    prevProps.pathName === nextProps.pathName &&
    prevProps.search === nextProps.search &&
    deepEqual(prevProps.navTabs, nextProps.navTabs) &&
    deepEqual(prevProps.state, nextProps.state)
);

export const SecuritySolutionTabNavigation: React.FC<SecuritySolutionTabNavigationProps> =
  React.memo(
    (props) => {
      const [routeProps] = useRouteSpy();
      const stateNavReduxProps: RouteSpyState & SecuritySolutionTabNavigationProps = {
        ...routeProps,
        ...props,
      };

      return <SecuritySolutionTabNavigationRedux {...stateNavReduxProps} />;
    },
    (prevProps, nextProps) => deepEqual(prevProps.navTabs, nextProps.navTabs)
  );
SecuritySolutionTabNavigation.displayName = 'SecuritySolutionTabNavigation';
