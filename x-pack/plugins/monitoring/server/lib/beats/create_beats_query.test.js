/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBeatsQuery } from './create_beats_query';

// TODO: tests were not running and are not up to date
describe.skip('createBeatsQuery', () => {
  const noApmFilter = {
    bool: {
      must_not: {
        term: {
          'beats_stats.beat.type': 'apm-server',
        },
      },
    },
  };

  it('adds filters if no filter exists', () => {
    const query1 = createBeatsQuery();
    const query2 = createBeatsQuery({});

    expect(query1.bool.filter[0]).toEqual({ term: { type: 'beats_stats' } });
    expect(query1.bool.filter[query1.bool.filter.length - 1]).toEqual(noApmFilter);
    expect(query2.bool.filter[0]).toEqual({ term: { type: 'beats_stats' } });
    expect(query2.bool.filter[query2.bool.filter.length - 1]).toEqual(noApmFilter);
  });

  it('adds filters with other filters', () => {
    const fauxFilter1 = { iam: { notvalid: {} } };
    const fauxFilter2 = { ditto: {} };

    const filters1 = [fauxFilter1];
    const filters2 = [fauxFilter2, fauxFilter1];

    [filters1, filters2].forEach((filters) => {
      const query = createBeatsQuery({ filters });
      const queryFilters = query.bool.filter;
      const filterCount = queryFilters.length;

      expect(queryFilters[0]).toEqual({ term: { type: 'beats_stats' } });

      filters.forEach((filter, index) => {
        // "custom" filters are added at the end of all known filters, and the last "custom" filter is the noApmFilter
        expect(queryFilters[filterCount - (filters.length - index)]).toEqual(filter);
      });

      expect(queryFilters[filterCount - 1]).toEqual(noApmFilter);
    });
  });
});
