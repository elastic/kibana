/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedSearchObjectAttributes, TimeRangeParams } from '../../';
import { QueryFilter, SearchSourceFilter } from './';

import { getFilters } from './get_filters';

interface Args {
  indexPatternId: string;
  indexPatternTimeField: string | null;
  timerange: TimeRangeParams | null;
  savedSearchObjectAttr: SavedSearchObjectAttributes;
  searchSourceFilter: SearchSourceFilter;
  queryFilter: QueryFilter;
}

describe('CSV from Saved Object: get_filters', () => {
  let args: Args;
  beforeEach(() => {
    args = {
      indexPatternId: 'logs-test-*',
      indexPatternTimeField: '@testtimestamp',
      timerange: {
        timezone: 'UTC',
        min: '1901-01-01T00:00:00.000Z',
        max: '1902-01-01T00:00:00.000Z',
      },
      savedSearchObjectAttr: {
        title: 'test',
        sort: [{ sortField: { order: 'asc' } }],
        kibanaSavedObjectMeta: {
          searchSource: {
            query: 'hello searchSource query',
            filter: ['hello searchSource filter 1'],
          },
        },
        uiState: null,
      },
      searchSourceFilter: { isSearchSourceFilter: true, isFilter: true },
      queryFilter: { isQueryFilter: true, isFilter: true },
    };
  });

  it('for timebased search', () => {
    const filters = getFilters(
      args.indexPatternId,
      args.indexPatternTimeField,
      args.timerange,
      args.savedSearchObjectAttr,
      args.searchSourceFilter,
      args.queryFilter
    );

    expect(filters).toEqual({
      combinedFilter: [
        {
          range: {
            '@testtimestamp': {
              format: 'strict_date_time',
              gte: '1901-01-01T00:00:00Z',
              lte: '1902-01-01T00:00:00Z',
            },
          },
        },
        { isFilter: true, isSearchSourceFilter: true },
        { isFilter: true, isQueryFilter: true },
      ],
      includes: ['@testtimestamp'],
      timezone: 'UTC',
    });
  });

  it('for non-timebased search', () => {
    args.indexPatternTimeField = null;
    args.timerange = null;

    const filters = getFilters(
      args.indexPatternId,
      args.indexPatternTimeField,
      args.timerange,
      args.savedSearchObjectAttr,
      args.searchSourceFilter,
      args.queryFilter
    );

    expect(filters).toEqual({
      combinedFilter: [
        { isFilter: true, isSearchSourceFilter: true },
        { isFilter: true, isQueryFilter: true },
      ],
      includes: [],
      timezone: null,
    });
  });

  describe('errors', () => {
    it('throw if timebased and timerange is missing', () => {
      args.timerange = null;

      const throwFn = () =>
        getFilters(
          args.indexPatternId,
          args.indexPatternTimeField,
          args.timerange,
          args.savedSearchObjectAttr,
          args.searchSourceFilter,
          args.queryFilter
        );

      expect(throwFn).toThrow(
        'Time range params are required for index pattern [logs-test-*], using time field [@testtimestamp]'
      );
    });
  });
});
