/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';
import { Filter, Query } from 'src/plugins/data/public';

export interface MapsAppState {
  query?: Query | null;
  savedQueryId?: string;
  filters?: Filter[];
}

export class AppStateManager {
  _query: Query | null = null;
  _savedQueryId: string = '';
  _filters: Filter[] = [];

  _updated$ = new Subject();

  setQueryAndFilters({ query, savedQueryId, filters }: MapsAppState) {
    if (query && this._query !== query) {
      this._query = query;
    }
    if (savedQueryId && this._savedQueryId !== savedQueryId) {
      this._savedQueryId = savedQueryId;
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

  getAppState(): MapsAppState {
    return {
      query: this._query,
      savedQueryId: this._savedQueryId,
      filters: this._filters,
    };
  }
}
