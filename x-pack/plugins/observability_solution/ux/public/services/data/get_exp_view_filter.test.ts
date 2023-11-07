/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExploratoryViewFilter } from './get_exp_view_filter';

const urlParams = {
  start: '2022-08-02T08:35:00.000Z',
  end: '2022-08-02T08:50:32.150Z',
  exactStart: '2022-08-02T08:35:32.150Z',
  exactEnd: '2022-08-02T08:50:32.150Z',
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  page: 0,
  percentile: 50,
  transactionUrl: 'https://www.elastic.co/',
  location: 'US',
  serviceName: 'elastic-co-frontend',
};

const uiFilters = {
  environment: 'ENVIRONMENT_ALL',
  transactionUrl: ['https://www.elastic.co/'],
  location: ['US'],
  serviceName: ['elastic-co-frontend'],
};

describe('getExploratoryViewFilter', function () {
  it('should return as expected', function () {
    const result = getExploratoryViewFilter(
      {
        browser: ['Chrome'],
        environment: 'production',
      },
      {}
    );

    expect(result).toEqual([
      {
        field: 'user_agent.name',
        values: ['Chrome'],
      },
    ]);
  });

  it('should not return service name in filters', function () {
    const result = getExploratoryViewFilter(uiFilters, urlParams);

    expect(result).toEqual([
      {
        field: 'url.full',
        values: ['https://www.elastic.co/'],
      },
      {
        field: 'client.geo.country_iso_code',
        values: ['US'],
      },
    ]);
  });
});
