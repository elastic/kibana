/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';

export class AppStateManager {
  _query = '';
  _savedQuery = '';
  _filters = [];

  _updated$ = new Subject();

  setQueryAndFilters({ query, savedQuery, filters }) {
    if (this._query !== query) {
      this._query = query;
    }
    if (this._savedQuery !== savedQuery) {
      this._savedQuery = savedQuery;
    }
    if (this._filters !== filters) {
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
