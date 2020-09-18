/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimeRangeParams } from '../../../types';
import { QueryFilter, SavedSearchObjectAttributes, SearchSourceFilter } from '../types';
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
      indexPatternTimeField: 'testtimestamp',
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
            query: { isSearchSourceQuery: true },
            filter: ['hello searchSource filter 1'],
          },
        },
        columns: ['larry'],
        uiState: null,
      },
      searchSourceFilter: { isSearchSourceFilter: true, isFilter: true },
      queryFilter: { isQueryFilter: true, isFilter: true },
    };
  });

  describe('search', () => {
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
              testtimestamp: {
                format: 'strict_date_time',
                gte: '1901-01-01T00:00:00Z',
                lte: '1902-01-01T00:00:00Z',
              },
            },
          },
          { isFilter: true, isSearchSourceFilter: true },
          { isFilter: true, isQueryFilter: true },
        ],
        includes: ['testtimestamp', 'larry'],
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
        includes: ['larry'],
        timezone: null,
      });
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
        'Time range params are required for index pattern [logs-test-*], using time field [testtimestamp]'
      );
    });
  });

  it('composes the defined filters', () => {
    expect(
      getFilters(
        args.indexPatternId,
        args.indexPatternTimeField,
        args.timerange,
        args.savedSearchObjectAttr,
        undefined,
        undefined
      )
    ).toEqual({
      combinedFilter: [
        {
          range: {
            testtimestamp: {
              format: 'strict_date_time',
              gte: '1901-01-01T00:00:00Z',
              lte: '1902-01-01T00:00:00Z',
            },
          },
        },
      ],
      includes: ['testtimestamp', 'larry'],
      timezone: 'UTC',
    });

    expect(
      getFilters(
        args.indexPatternId,
        args.indexPatternTimeField,
        args.timerange,
        args.savedSearchObjectAttr,
        undefined,
        args.queryFilter
      )
    ).toEqual({
      combinedFilter: [
        {
          range: {
            testtimestamp: {
              format: 'strict_date_time',
              gte: '1901-01-01T00:00:00Z',
              lte: '1902-01-01T00:00:00Z',
            },
          },
        },
        { isFilter: true, isQueryFilter: true },
      ],
      includes: ['testtimestamp', 'larry'],
      timezone: 'UTC',
    });
  });

  describe('timefilter', () => {
    it('formats the datetime to the provided timezone', () => {
      args.timerange = {
        timezone: 'MST',
        min: '1901-01-01T00:00:00Z',
        max: '1902-01-01T00:00:00Z',
      };

      expect(
        getFilters(
          args.indexPatternId,
          args.indexPatternTimeField,
          args.timerange,
          args.savedSearchObjectAttr
        )
      ).toEqual({
        combinedFilter: [
          {
            range: {
              testtimestamp: {
                format: 'strict_date_time',
                gte: '1900-12-31T17:00:00-07:00',
                lte: '1901-12-31T17:00:00-07:00',
              },
            },
          },
        ],
        includes: ['testtimestamp', 'larry'],
        timezone: 'MST',
      });
    });
  });
});
