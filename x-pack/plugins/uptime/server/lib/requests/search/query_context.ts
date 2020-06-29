/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { LegacyAPICaller } from 'src/core/server';
import { CursorPagination } from './types';
import { parseRelativeDate } from '../../helper';
import { CursorDirection, SortOrder } from '../../../../common/runtime_types';

export class QueryContext {
  callES: LegacyAPICaller;
  heartbeatIndices: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  pagination: CursorPagination;
  filterClause: any | null;
  size: number;
  statusFilter?: string;
  hasTimespanCache?: boolean;

  constructor(
    database: any,
    heartbeatIndices: string,
    dateRangeStart: string,
    dateRangeEnd: string,
    pagination: CursorPagination,
    filterClause: any | null,
    size: number,
    statusFilter?: string
  ) {
    this.callES = database;
    this.heartbeatIndices = heartbeatIndices;
    this.dateRangeStart = dateRangeStart;
    this.dateRangeEnd = dateRangeEnd;
    this.pagination = pagination;
    this.filterClause = filterClause;
    this.size = size;
    this.statusFilter = statusFilter;
  }

  async search(params: any): Promise<any> {
    params.index = this.heartbeatIndices;
    return this.callES('search', params);
  }

  async count(params: any): Promise<any> {
    params.index = this.heartbeatIndices;
    return this.callES('count', params);
  }

  async dateAndCustomFilters(): Promise<any[]> {
    const clauses = [await this.dateRangeFilter()];
    if (this.filterClause) {
      clauses.push(this.filterClause);
    }
    return clauses;
  }

  async dateRangeFilter(): Promise<any> {
    const timestampClause = {
      range: { '@timestamp': { gte: this.dateRangeStart, lte: this.dateRangeEnd } },
    };

    if (!(await this.hasTimespan())) {
      return timestampClause;
    }

    return {
      bool: {
        filter: [
          timestampClause,
          {
            bool: {
              should: [
                this.timespanClause(),
                {
                  bool: {
                    must_not: { exists: { field: 'monitor.timespan' } },
                  },
                },
              ],
            },
          },
        ],
      },
    };
  }

  // timeRangeClause queries the given date range using the monitor timespan field
  // which is a bit dicey since we may have data that predates this field existing,
  // or we may have data that has it, but a slow ingestion process.
  timespanClause() {
    // We subtract 5m from the start to account for data that shows up late,
    // for instance, with a large value for the elasticsearch refresh interval
    // setting it lower can work very well on someone's laptop, but with real world
    // latencies and slowdowns that's dangerous. Making this value larger makes things
    // only slower, but only marginally so, and prevents people from seeing weird
    // behavior.

    const tsEnd = parseRelativeDate(this.dateRangeEnd, { roundUp: true })!;
    const tsStart = moment(tsEnd).subtract(5, 'minutes');

    return {
      range: {
        'monitor.timespan': {
          gte: tsStart.toISOString(),
          lte: tsEnd.toISOString(),
        },
      },
    };
  }

  async hasTimespan(): Promise<boolean> {
    if (this.hasTimespanCache) {
      return this.hasTimespanCache;
    }

    this.hasTimespanCache =
      (
        await this.count({
          body: {
            query: {
              bool: {
                filter: [this.timespanClause()],
              },
            },
          },
          terminate_after: 1,
        })
      ).count > 0;

    return this.hasTimespanCache;
  }

  clone(): QueryContext {
    return new QueryContext(
      this.callES,
      this.heartbeatIndices,
      this.dateRangeStart,
      this.dateRangeEnd,
      this.pagination,
      this.filterClause,
      this.size,
      this.statusFilter
    );
  }

  // Returns true if the order returned by the ES query matches the requested sort order.
  // This useful to determine if the results need to be reversed from their ES results order.
  // I.E. when navigating backwards using prevPagePagination (CursorDirection.Before) yet using a SortOrder.ASC.
  searchSortAligned(): boolean {
    if (this.pagination.cursorDirection === CursorDirection.AFTER) {
      return this.pagination.sortOrder === SortOrder.ASC;
    } else {
      return this.pagination.sortOrder === SortOrder.DESC;
    }
  }

  cursorOrder(): 'asc' | 'desc' {
    return CursorDirection[this.pagination.cursorDirection] === CursorDirection.AFTER
      ? 'asc'
      : 'desc';
  }
}
