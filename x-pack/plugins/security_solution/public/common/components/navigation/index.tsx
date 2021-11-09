/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import deepEqual from 'fast-deep-equal';

import { useKibana } from '../../lib/kibana';
import { RouteSpyState } from '../../utils/route/types';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import { makeMapStateToProps } from '../url_state/helpers';
import { useSetBreadcrumbs } from './breadcrumbs';
import { TabNavigation } from './tab_navigation';
import { TabNavigationComponentProps, SecuritySolutionTabNavigationProps } from './types';

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

    const setBreadcrumbs = useSetBreadcrumbs();

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
    }, [
      chrome,
      pageName,
      pathName,
      search,
      navTabs,
      urlState,
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

export const SecuritySolutionTabNavigationRedux = compose<
  React.ComponentClass<SecuritySolutionTabNavigationProps & RouteSpyState>
>(connect(makeMapStateToProps))(
  React.memo(
    TabNavigationComponent,
    (prevProps, nextProps) =>
      prevProps.pathName === nextProps.pathName &&
      prevProps.search === nextProps.search &&
      deepEqual(prevProps.navTabs, nextProps.navTabs) &&
      deepEqual(prevProps.urlState, nextProps.urlState) &&
      deepEqual(prevProps.state, nextProps.state)
  )
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
