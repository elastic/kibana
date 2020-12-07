/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface BackgroundSessionSavedObjectAttributes {
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
  idMapping: Record<string, string>;
}

export interface BackgroundSessionFindOptions {
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: string;
  filter?: string;
}
