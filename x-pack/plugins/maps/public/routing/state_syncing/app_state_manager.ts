/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';
import { Filter, SavedQuery, Query } from 'src/plugins/data/public';

export class AppStateManager {
  _query: string | { [key: string]: any } = '';
  _savedQuery: SavedQuery | string = '';
  _filters: Filter[] = [];

  _updated$ = new Subject();

  setQueryAndFilters({ query, savedQuery, filters }: {
    query?: Query;
    filters?: Filter[];
    savedQuery?: SavedQuery | string;
  }) {
    if (query && this._query !== query) {
      this._query = query;
    }
    if (savedQuery && this._savedQuery !== savedQuery) {
      this._savedQuery = savedQuery;
    }
    if (filters && this._filters !== filters) {
      this._filters = filters;
    }
    this._updated$.next();
  }

  getQuery() {
    return this._query;
  }

  getFilters() {
    return this._filters;
  }

  getAppState() {
    return {
      query: this._query,
      savedQuery: this._savedQuery,
      filters: this._filters,
    };
  }
}
