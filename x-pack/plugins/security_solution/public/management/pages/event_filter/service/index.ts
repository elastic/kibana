/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from 'kibana/public';

// TODO: pending to add Types
export interface EventFiltersService {
  addEventFilter(params: {}): Promise<{}>;
}

export class EventFiltersHttpService implements EventFiltersService {
  constructor(private http: HttpStart) {}

  // TODO: pending to add const with api namespace
  async addEventFilter(request: {}) {
    return this.http.post<{}>('apiCall', {
      body: JSON.stringify(request),
    });
  }
}
