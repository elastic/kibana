/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { pickBy } from 'lodash/fp';
import { usePrimaryNavigation } from './use_primary_navigation';
import { useGetUserCasesPermissions, useKibana } from '../../../lib/kibana';
import { setBreadcrumbs } from '../breadcrumbs';
import { makeMapStateToProps } from '../../url_state/helpers';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import { navTabs } from '../../../../app/home/home_navigations';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { SecurityPageName } from '../../../../../common/constants';

/**
 * @description - This hook provides the structure necessary by the KibanaPageTemplate for rendering the primary security_solution side navigation.
 * TODO: Consolidate & re-use the logic in the hooks in this directory that are replicated from the tab_navigation to maintain breadcrumbs, telemetry, etc...
 */
export const useSecuritySolutionNavigation = () => {
  const [routeProps] = useRouteSpy();
  const urlMapState = makeMapStateToProps();
  const { urlState } = useDeepEqualSelector(urlMapState);
  const {
    chrome,
    application: { getUrlForApp },
  } = useKibana().services;

  const { detailName, flowTarget, pageName, pathName, search, state, tabName } = routeProps;

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
  }, [
    chrome,
    pageName,
    pathName,
    search,
    urlState,
    state,
    detailName,
    flowTarget,
    tabName,
    getUrlForApp,
  ]);

  const hasCasesReadPermissions = useGetUserCasesPermissions()?.read;

  // build a list of tabs to exclude
  const tabsToExclude = new Set<string>([
    ...(!hasCasesReadPermissions ? [SecurityPageName.case] : []),
  ]);

  // include the tab if it is not in the set of excluded ones
  const tabsToDisplay = pickBy((_, key) => !tabsToExclude.has(key), navTabs);

  return usePrimaryNavigation({
    query: urlState.query,
    filters: urlState.filters,
    navTabs: tabsToDisplay,
    pageName,
    sourcerer: urlState.sourcerer,
    savedQuery: urlState.savedQuery,
    timeline: urlState.timeline,
    timerange: urlState.timerange,
  });
};
