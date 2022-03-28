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
  dayAndWeekBeforeToOffset,
} from '../../../components/shared/time_comparison/get_comparison_options';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { getComparisonEnabled } from '../../../components/shared/time_comparison/get_comparison_enabled';
import { toBoolean } from '../../../context/url_params_context/helpers';

export function RedirectWithOffset({
  children,
}: {
  children: React.ReactElement;
}) {
  const { core } = useApmPluginContext();
  const location = useLocation();
  const apmRouter = useApmRouter();
  const matchesRoute = isRouteWithTimeRange({ apmRouter, location });
  const query = qs.parse(location.search);

  // Redirect when 'comparisonType' is set as we now use offset instead
  // or when 'comparisonEnabled' is not set as it's now required
  if (
    matchesRoute &&
    ('comparisonType' in query || !('comparisonEnabled' in query))
  ) {
    const {
      comparisonType,
      comparisonEnabled: urlComparisonEnabled,
      ...queryRest
    } = query;

    const comparisonEnabled = getComparisonEnabled({
      core,
      urlComparisonEnabled: urlComparisonEnabled
        ? toBoolean(urlComparisonEnabled as string)
        : undefined,
    }).toString();

    const comparisonTypeEnumValue = comparisonType as
      | TimeRangeComparisonEnum.DayBefore
      | TimeRangeComparisonEnum.WeekBefore;

    const dayOrWeekOffset = dayAndWeekBeforeToOffset[comparisonTypeEnumValue];

    return (
      <Redirect
        to={qs.stringifyUrl({
          url: location.pathname,
          query: {
            comparisonEnabled,
            ...(dayOrWeekOffset ? { offset: dayOrWeekOffset } : {}),
            ...queryRest,
          },
        })}
      />
    );
  }

  return children;
}
