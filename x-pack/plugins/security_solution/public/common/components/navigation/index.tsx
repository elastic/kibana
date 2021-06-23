/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import deepEqual from 'fast-deep-equal';

import { useKibana } from '../../lib/kibana';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import { useUrlState } from '../url_state/helpers';
import { setBreadcrumbs } from './breadcrumbs';
import { TabNavigation } from './tab_navigation';
import { TabNavigationComponentProps, SecuritySolutionTabNavigationProps } from './types';
import { RouteSpyState } from '../../utils/route/types';

/**
 * @description - This component handels all of the tab navigation seen within a Security Soluton application page, not the Security Solution primary side navigation
 * For the primary side nav see './use_security_solution_navigation'
 */
export const TabNavigationComponent: React.FC<
  RouteSpyState & SecuritySolutionTabNavigationProps & TabNavigationComponentProps
> = React.memo(
  ({
    detailName,
    display,
    flowTarget,
    navTabs,
    pageName,
    pathName,
    search,
    state,
    tabName,
    urlState,
  }) => {
    const {
      chrome,
      application: { getUrlForApp, navigateToUrl },
    } = useKibana().services;

    useEffect(() => {
      if (pathName || pageName) {
        setBreadcrumbs(
          {
            detailName,
            filters: urlState.filters,
            flowTarget,
            navTabs,
            pageName,
            pathName,
            query: urlState.query,
            savedQuery: urlState.savedQuery,
            search,
            sourcerer: urlState.sourcerer,
            state,
            tabName,
            timeline: urlState.timeline,
            timerange: urlState.timerange,
          },
          chrome,
          getUrlForApp,
          navigateToUrl
        );
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chrome, pageName, pathName, search, navTabs, urlState, state]);

    return (
      <TabNavigation
        query={urlState.query}
        display={display}
        filters={urlState.filters}
        navTabs={navTabs}
        pageName={pageName}
        pathName={pathName}
        sourcerer={urlState.sourcerer}
        savedQuery={urlState.savedQuery}
        tabName={tabName}
        timeline={urlState.timeline}
        timerange={urlState.timerange}
      />
    );
  }
);
TabNavigationComponent.displayName = 'TabNavigationComponent';

export const SecuritySolutionTabNavigation: React.FC<SecuritySolutionTabNavigationProps> = React.memo(
  (props) => {
    const [routeProps] = useRouteSpy();
    const urlStateProps = useUrlState();
    const navigationManagerProps: RouteSpyState &
      TabNavigationComponentProps &
      SecuritySolutionTabNavigationProps = {
      ...routeProps,
      ...urlStateProps,
      ...props,
    };

    return <TabNavigationComponent {...navigationManagerProps} />;
  },
  (prevProps, nextProps) => deepEqual(prevProps.navTabs, nextProps.navTabs)
);
SecuritySolutionTabNavigation.displayName = 'SecuritySolutionTabNavigation';
