/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestBasicOptions } from './types';

export interface PaginationInputPaginated {
  /** The activePage parameter defines the page of results you want to fetch */
  activePage: number;
  /** The cursorStart parameter defines the start of the results to be displayed */
  cursorStart: number;
  /** The querySize parameter is the number of items to be returned */
  querySize: number;
}

export interface RequestOptionsPaginated<Field = string> extends RequestBasicOptions {
  pagination: PaginationInputPaginated;
}
