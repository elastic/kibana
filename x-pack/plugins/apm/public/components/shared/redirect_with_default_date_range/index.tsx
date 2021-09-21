/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ReactElement } from 'react';
import { useLocation } from 'react-router-dom';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useDateRangeRedirect } from '../../../hooks/use_date_range_redirect';

export function RedirectWithDefaultDateRange({
  children,
}: {
  children: ReactElement;
}) {
  const { isDateRangeSet, redirect } = useDateRangeRedirect();

  const apmRouter = useApmRouter();
  const location = useLocation();

  const matchingRoutes = apmRouter.getRoutesToMatch(location.pathname);

  if (
    !isDateRangeSet &&
    matchingRoutes.some((route) => {
      return (
        route.path === '/services' ||
        route.path === '/traces' ||
        route.path === '/service-map' ||
        route.path === '/backends' ||
        route.path === '/services/{serviceName}' ||
        location.pathname === '/' ||
        location.pathname === ''
      );
    })
  ) {
    redirect();
    return null;
  }

  return children;
}
