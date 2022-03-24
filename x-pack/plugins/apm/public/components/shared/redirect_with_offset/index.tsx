/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation, Redirect } from 'react-router-dom';
import qs from 'query-string';
import React from 'react';
import moment from 'moment';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { getDateRange } from '../../../context/url_params_context/helpers';
import { isRouteWithTimeRange } from '../is_route_with_time_range';

import {
  TimeRangeComparisonEnum,
  getSelectOptions,
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
    Object.values(TimeRangeComparisonEnum).includes(
      query.comparisonType as TimeRangeComparisonEnum
    )
  ) {
    const { rangeFrom, rangeTo, comparisonType, ...queryRest } = query;

    const { start, end } = getDateRange({
      rangeFrom: rangeFrom as string,
      rangeTo: rangeTo as string,
    });

    const momentStart = moment(start);
    const momentEnd = moment(end);

    const offset = getSelectOptions({
      comparisonTypes: [comparisonType as TimeRangeComparisonEnum],
      start: momentStart,
      end: momentEnd,
      msDiff: momentEnd.diff(momentStart, 'ms', true),
    })[0].value;

    return (
      <Redirect
        to={qs.stringifyUrl({
          url: location.pathname,
          query: {
            rangeFrom,
            rangeTo,
            offset,
            ...queryRest,
          },
        })}
      />
    );
  }

  return children;
}
