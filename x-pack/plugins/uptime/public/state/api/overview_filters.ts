/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetOverviewFiltersPayload } from '../actions';
import { API_URLS, OverviewFiltersType } from '../../../common';
import { apiService } from './utils';

export const fetchOverviewFilters = async ({
  dateRangeStart,
  dateRangeEnd,
  search,
  schemes,
  locations,
  ports,
  tags,
}: GetOverviewFiltersPayload) => {
  const queryParams = {
    dateRangeStart,
    dateRangeEnd,
    schemes,
    locations,
    ports,
    tags,
    search,
  };

  return await apiService.get(API_URLS.FILTERS, queryParams, OverviewFiltersType);
};
