/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFilteredQueryAndStatusFilter } from '../get_filtered_query_and_status';

describe('getFilteredQueryAndStatusFilter', () => {
  let dateRangeStart: string;
  let dateRangeEnd: string;
  let filters: string | null;

  beforeEach(() => {
    dateRangeStart = 'startRange';
    dateRangeEnd = 'endRange';
    filters = null;
  });

  it('returns a range filter for empty filters object', () => {
    const result = getFilteredQueryAndStatusFilter(dateRangeStart, dateRangeEnd, filters);
    expect(result).toMatchSnapshot();
  });

  it('returns a range + id filter when status filter is absent', () => {
    filters = `{"bool":{"must":[{"match":{"monitor.id":{"query":"theID","operator":"and"}}}]}}`;
    const result = getFilteredQueryAndStatusFilter(dateRangeStart, dateRangeEnd, filters);
    expect(result).toMatchSnapshot();
  });

  it('returns a range filter and a status value when no other filters are present', () => {
    filters = `{"bool":{"must":[{"match":{"monitor.status":{"query":"down","operator":"and"}}}]}}`;
    const result = getFilteredQueryAndStatusFilter(dateRangeStart, dateRangeEnd, filters);
    expect(result).toMatchSnapshot();
  });

  it('returns a range + id filter with status value', () => {
    filters = `{"bool":{"must":[{"match":{"monitor.status":{"query":"down","operator":"and"}}},{"match":{"monitor.id":{"query":"theID","operator":"and"}}}]}}`;
    const result = getFilteredQueryAndStatusFilter(dateRangeStart, dateRangeEnd, filters);
    expect(result).toMatchSnapshot();
  });
});
