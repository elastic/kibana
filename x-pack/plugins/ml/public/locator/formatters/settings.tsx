/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import { CalendarEditUrlState, FilterEditUrlState } from '../../../common/types/locator';
import { ML_PAGES } from '../../../common/constants/locator';

export function formatEditCalendarUrl(
  appBasePath: string,
  pageState: CalendarEditUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.CALENDARS_EDIT}`;
  if (pageState) {
    const { globalState, calendarId } = pageState;
    if (calendarId !== undefined) {
      url = `${url}/${calendarId}`;
    }
    if (globalState) {
      url = setStateToKbnUrl('_g', globalState, { useHash: false, storeInHashQuery: false }, url);
    }
  }

  return url;
}

export function formatEditFilterUrl(
  appBasePath: string,
  pageState: FilterEditUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.FILTER_LISTS_EDIT}`;
  if (pageState) {
    const { globalState, filterId } = pageState;
    if (filterId !== undefined) {
      url = `${url}/${filterId}`;
    }
    if (globalState) {
      url = setStateToKbnUrl('_g', globalState, { useHash: false, storeInHashQuery: false }, url);
    }
  }

  return url;
}
