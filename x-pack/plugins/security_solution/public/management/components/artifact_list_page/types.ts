/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ArtifactListPageUrlParams {
  page?: number;
  perPage?: number;
  filter?: string;
  includedPolicies?: string;
  show?: 'create' | 'edit';
  itemId?: string;
  sortField?: string;
  sortOrder?: string;
}
