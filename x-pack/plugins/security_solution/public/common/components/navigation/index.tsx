/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React, { useEffect } from 'react';
import deepEqual from 'fast-deep-equal';

import { useKibana } from '../../lib/kibana';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import { useUrlState } from '../url_state/helpers';
import { setBreadcrumbs } from './breadcrumbs';
import { TabNavigation } from './tab_navigation';
import { NavigationManagerComponentProps, SecuritySolutionNavigationManagerProps } from './types';
import { SecuritySolutionNavigation } from './primary_navigation';
import { RouteSpyState } from '../../utils/route/types';

/**
 * @description - This component handels all of the navigation seen within the Security Solution application.
 * For the primary sideNav the SecuritySolutionNavigation is rendered when `isPrimary` is true, while all tabs within pages are rendered
 * using the TabNavigation component. This allows us to manage breadcrumbs, telemetry, and general url syncing in a single place.
 */
export const NavigationManagerComponent: React.FC<
  RouteSpyState & SecuritySolutionNavigationManagerProps & NavigationManagerComponentProps
> = React.memo(
  ({
    detailName,
    display,
    flowTarget,
    isPrimary,
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
      application: { getUrlForApp },
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
          getUrlForApp
        );
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chrome, pageName, pathName, search, navTabs, urlState, state]);

    return isPrimary ? (
      <SecuritySolutionNavigation
        navTabs={navTabs}
        pageName={pageName}
        tabName={tabName}
        urlState={urlState}
      />
    ) : (
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

const NavigationManagerContainer: React.FC<SecuritySolutionNavigationManagerProps> = React.memo(
  (props) => {
    const [routeProps] = useRouteSpy();
    const urlStateProps = useUrlState();
    const navigationManagerProps: RouteSpyState &
      NavigationManagerComponentProps &
      SecuritySolutionNavigationManagerProps = {
      ...routeProps,
      ...urlStateProps,
      ...props,
    };

    return <NavigationManagerComponent {...navigationManagerProps} />;
  }
);

export const SecuritySolutionNavigationManager = React.memo(
  NavigationManagerContainer,
  (prevProps, nextProps) => deepEqual(prevProps.navTabs, nextProps.navTabs)
);
