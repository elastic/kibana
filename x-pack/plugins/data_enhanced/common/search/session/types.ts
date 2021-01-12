/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface SearchSessionSavedObjectAttributes {
  /**
   * User-facing session name to be displayed in session management
   */
  name: string;
  /**
   * App that created the session. e.g 'discover'
   */
  appId: string;
  created: string;
  expires: string;
  status: string;
  urlGeneratorId: string;
  initialState: Record<string, unknown>;
  restoreState: Record<string, unknown>;
  idMapping: Record<string, SearchSessionRequestInfo>;
}

export interface SearchSessionRequestInfo {
  id: string; // ID of the async search request
  strategy: string; // Search strategy used to submit the search request
}

export interface SearchSessionFindOptions {
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: string;
  filter?: string;
}
