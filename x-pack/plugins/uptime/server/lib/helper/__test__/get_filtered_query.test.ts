/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFilteredQuery } from '../get_filtered_query';

describe('getFilteredQuery', () => {
  let dateRangeStart: string;
  let dateRangeEnd: string;
  let filters: string | null;

  beforeEach(() => {
    dateRangeStart = 'now-15m';
    dateRangeEnd = 'now';
    filters = null;
  });

  it('applies a range filter', () => {
    const result = getFilteredQuery(dateRangeStart, dateRangeEnd, filters);
    expect(result).toMatchSnapshot();
  });

  it('applies generated must filters to filter list', () => {
    filters = `
      {
        "bool": {
          "must": [
            {
              "term": {
                "monitor.id": "foo.bar"
              }
            }
          ]
        }
      }
    `;
    const result = getFilteredQuery(dateRangeStart, dateRangeEnd, filters);
    expect(result).toMatchSnapshot();
  });
});
