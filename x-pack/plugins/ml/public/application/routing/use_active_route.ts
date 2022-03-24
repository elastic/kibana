/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation, useRouteMatch } from 'react-router-dom';
import { keyBy } from 'lodash';
import { useMemo } from 'react';
import type { MlRoute } from './router';

export const useActiveRoute = (routesList: MlRoute[]): MlRoute => {
  const { pathname } = useLocation();

  /**
   * Temp fix for routes with params.
   */
  const editCalendarMatch = useRouteMatch('/settings/calendars_list/edit_calendar/:calendarId');
  const editFilterMatch = useRouteMatch('/settings/filter_lists/edit_filter_list/:filterId');

  const routesMap = useMemo(() => keyBy(routesList, 'path'), []);

  const activeRoute = useMemo(() => {
    if (editCalendarMatch) {
      return routesMap[editCalendarMatch.path];
    }
    if (editFilterMatch) {
      return routesMap[editFilterMatch.path];
    }
    // Remove trailing slash from the pathname
    const pathnameKey = pathname.replace(/\/$/, '');
    return routesMap[pathnameKey];
  }, [pathname]);

  return activeRoute ?? routesMap['/overview'];
};
