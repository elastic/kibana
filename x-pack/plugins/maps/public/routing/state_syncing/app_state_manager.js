/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';

export class AppStateManager {
  query = '';
  savedQuery = '';
  filters = [];

  updated$ = new Subject();

  setQueryAndFilters({ query, savedQuery, filters }) {
    if (this.query !== query) {
      this.query = query;
    }
    if (this.savedQuery !== savedQuery) {
      this.savedQuery = savedQuery;
    }
    if (this.filters !== filters) {
      this.filters = filters;
    }
    this.updated$.next();
  }

  getQuery() {
    return this.query;
  }

  getFilters() {
    return this.filters;
  }

  getAppState() {
    return {
      query: this.query,
      savedQuery: this.savedQuery,
      filters: this.filters,
    };
  }
}
