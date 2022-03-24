/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation, Redirect } from 'react-router-dom';
import qs from 'query-string';
import React from 'react';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { isRouteWithTimeRange } from '../is_route_with_time_range';
import {
  TimeRangeComparisonEnum,
  dayAndWeekBeforeToOffsetMap,
} from '../../../components/shared/time_comparison/get_comparison_options';

export function RedirectWithOffset({
  children,
}: {
  children: React.ReactElement;
}) {
  const location = useLocation();
  const query = qs.parse(location.search);

  const apmRouter = useApmRouter();
  const matchesRoute = isRouteWithTimeRange({ apmRouter, location });

  if (
    'comparisonType' in query &&
    'rangeFrom' in query &&
    'rangeTo' in query &&
    matchesRoute &&
    (query.comparisonType as TimeRangeComparisonEnum) in
      dayAndWeekBeforeToOffsetMap
  ) {
    const { comparisonType, ...queryRest } = query;
    const offset =
      dayAndWeekBeforeToOffsetMap[
        query.comparisonType as
          | TimeRangeComparisonEnum.DayBefore
          | TimeRangeComparisonEnum.WeekBefore
      ];

    return (
      <Redirect
        to={qs.stringifyUrl({
          url: location.pathname,
          query: {
            offset,
            ...queryRest,
          },
        })}
      />
    );
  }

  return children;
}
