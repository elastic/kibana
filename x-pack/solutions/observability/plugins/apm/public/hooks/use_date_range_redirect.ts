/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import { useHistory, useLocation } from 'react-router-dom';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { useMemo } from 'react';
import datemath from '@kbn/datemath';
import type { Moment } from 'moment';
import type { TimePickerTimeDefaults } from '../components/shared/date_picker/typings';
import { useApmPluginContext } from '../context/apm_plugin/use_apm_plugin_context';
import { isInactiveHistoryError } from '../components/shared/links/url_helpers';

function tryParseDate(
  date: string | string[] | null | undefined,
  options?: { roundUp?: boolean }
): Moment | undefined {
  return typeof date === 'string' ? datemath.parse(date, options) : undefined;
}

function isValidDateRange(
  from: string | string[] | null | undefined,
  to: string | string[] | null | undefined
): boolean {
  const start = tryParseDate(from);
  const end = tryParseDate(to, { roundUp: true });

  return Boolean(start?.isValid() && end?.isValid() && start.isBefore(end));
}

export function useDateRangeRedirect() {
  const history = useHistory();
  const location = useLocation();
  const query = qs.parse(location.search);

  const { core, plugins } = useApmPluginContext();

  const timePickerTimeDefaults = core?.uiSettings?.get<TimePickerTimeDefaults>(
    UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS
  );

  const timePickerSharedState = plugins.data.query.timefilter.timefilter.getTime();

  const isDateRangeSet = useMemo(() => {
    return isValidDateRange(query.rangeFrom, query.rangeTo);
  }, [query.rangeFrom, query.rangeTo]);

  const redirect = () => {
    const resolvedFrom = tryParseDate(query.rangeFrom)?.isValid()
      ? query.rangeFrom
      : timePickerSharedState.from;
    const resolvedTo = tryParseDate(query.rangeTo, { roundUp: true })?.isValid()
      ? query.rangeTo
      : timePickerSharedState.to;
    const isResolvedRangeValid = isValidDateRange(resolvedFrom, resolvedTo);
    const nextQuery = {
      ...query,
      rangeFrom: isResolvedRangeValid ? resolvedFrom : timePickerTimeDefaults.from,
      rangeTo: isResolvedRangeValid ? resolvedTo : timePickerTimeDefaults.to,
    };

    try {
      history.replace({
        ...location,
        search: qs.stringify(nextQuery),
      });
    } catch (error) {
      if (!isInactiveHistoryError(error)) {
        throw error;
      }
    }
  };

  return {
    isDateRangeSet,
    redirect,
  };
}
