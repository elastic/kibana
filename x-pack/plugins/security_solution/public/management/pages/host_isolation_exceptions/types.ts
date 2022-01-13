/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface HostIsolationExceptionsPageLocation {
  page_index: number;
  page_size: number;
  show?: 'create' | 'edit';
  /** Used for editing. The ID of the selected event filter */
  id?: string;
  filter: string;
  // A string with comma dlimetered list of included policy IDs
  included_policies: string;
}

export interface HostIsolationExceptionsPageState {
  location: HostIsolationExceptionsPageLocation;
}
