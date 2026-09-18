/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import qs from 'query-string';
import React from 'react';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { isRouteWithComparison } from '../../../shared/is_route_with_time_range';
import type { TimeRangeComparisonEnum } from '../../../shared/time_comparison/get_comparison_options';
import { dayAndWeekBeforeToOffset } from '../../../shared/time_comparison/get_comparison_options';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { getComparisonEnabled } from '../../../shared/time_comparison/get_comparison_enabled';
import { toBoolean } from '../../../../context/url_params_context/helpers';
import { RenderRedirectTo } from '../../redirect_to';

export function RedirectWithOffset({ children }: { children: React.ReactElement }) {
  const { core } = useApmPluginContext();
  const location = useLocation();
  const apmRouter = useApmRouter();
  const matchesRoute = isRouteWithComparison({ apmRouter, location });
  const query = qs.parse(location.search);

  // 'comparisonEnabled' is a required boolean; it's invalid when absent or not
  // 'true'/'false' (e.g. a bare `?comparisonEnabled` key parses as null).
  const isComparisonEnabledValid =
    query.comparisonEnabled === 'true' || query.comparisonEnabled === 'false';

  // Redirect to use offset instead of 'comparisonType', or to set a valid 'comparisonEnabled'.
  if (matchesRoute && ('comparisonType' in query || !isComparisonEnabledValid)) {
    const { comparisonType, comparisonEnabled: urlComparisonEnabled, ...queryRest } = query;

    const comparisonEnabled = getComparisonEnabled({
      core,
      // Only honor a valid URL value; otherwise use the advanced setting default.
      urlComparisonEnabled: isComparisonEnabledValid
        ? toBoolean(urlComparisonEnabled as string)
        : undefined,
    }).toString();

    const comparisonTypeEnumValue = comparisonType as
      | TimeRangeComparisonEnum.DayBefore
      | TimeRangeComparisonEnum.WeekBefore;

    const dayOrWeekOffset = dayAndWeekBeforeToOffset[comparisonTypeEnumValue];

    return (
      <RenderRedirectTo
        location={{
          ...location,
          search: qs.stringify({
            ...queryRest,
            comparisonEnabled,
            ...(dayOrWeekOffset ? { offset: dayOrWeekOffset } : {}),
          }),
        }}
        pathname={location.pathname}
      />
    );
  }

  return children;
}
