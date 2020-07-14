/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface PaginationInput {
  /** The limit parameter allows you to configure the maximum amount of items to be returned */
  limit: number;
  /** The cursor parameter defines the next result you want to fetch */
  cursor?: string;
  /** The tiebreaker parameter allow to be more precise to fetch the next item */
  tiebreaker?: string;
}

export enum Direction {
  asc = 'asc',
  desc = 'desc',
}

export interface SortField {
  sortFieldId: string;

  direction: Direction;
}

export interface TimelineQueryVariables {
  sourceId: string;
  fieldRequested: string[];
  pagination: PaginationInput;
  sortField: SortField;
  filterQuery?: string;
  defaultIndex: string[];
  inspect: boolean;
}
