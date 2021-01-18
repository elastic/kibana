/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { HttpFetchQuery } from 'src/core/public';

export interface ListWithKuery extends HttpFetchQuery {
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: 'desc' | 'asc';
  kuery?: string;
}
