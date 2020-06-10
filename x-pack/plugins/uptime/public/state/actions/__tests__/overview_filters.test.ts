/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  fetchOverviewFilters,
  fetchOverviewFiltersSuccess,
  fetchOverviewFiltersFail,
} from '../overview_filters';

describe('overview filters action creators', () => {
  it('creates a get action', () => {
    expect(
      fetchOverviewFilters({
        dateRangeStart: 'now-15m',
        dateRangeEnd: 'now',
        statusFilter: 'down',
        search: '',
        locations: ['fairbanks', 'tokyo'],
        ports: ['80'],
        schemes: ['http', 'tcp'],
        tags: ['api', 'dev'],
      })
    ).toMatchSnapshot();
  });

  it('creates a success action', () => {
    expect(
      fetchOverviewFiltersSuccess({
        locations: ['fairbanks', 'tokyo', 'london'],
        ports: [80, 443],
        schemes: ['http', 'tcp'],
        tags: ['api', 'dev', 'prod'],
      })
    ).toMatchSnapshot();
  });

  it('creates a fail action', () => {
    expect(
      fetchOverviewFiltersFail(new Error('There was an error retrieving the overview filters'))
    ).toMatchSnapshot();
  });
});
