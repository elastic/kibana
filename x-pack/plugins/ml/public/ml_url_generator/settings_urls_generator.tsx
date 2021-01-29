/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CalendarEditUrlState, FilterEditUrlState } from '../../common/types/ml_url_generator';
import { ML_PAGES } from '../../common/constants/ml_url_generator';
import { setStateToKbnUrl } from '../../../../../src/plugins/kibana_utils/public';

export function createEditCalendarUrl(
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

export function createEditFilterUrl(
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
