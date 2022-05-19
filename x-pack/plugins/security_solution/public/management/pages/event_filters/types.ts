/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FoundExceptionListItemSchema,
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  UpdateExceptionListItemSchema,
  ExceptionListSummarySchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { Immutable } from '../../../../common/endpoint/types';

export interface EventFiltersPageLocation {
  page_index: number;
  page_size: number;
  show?: 'create' | 'edit';
  /** Used for editing. The ID of the selected event filter */
  id?: string;
  filter: string;
  included_policies: string;
}

export type EventFiltersServiceGetListOptions = Partial<{
  page: number;
  perPage: number;
  sortField: keyof ExceptionListItemSchema;
  sortOrder: 'asc' | 'desc';
  filter: string;
}>;

export interface EventFiltersService {
  addEventFilters(
    exception: Immutable<ExceptionListItemSchema | CreateExceptionListItemSchema>
  ): Promise<ExceptionListItemSchema>;

  getList(options?: EventFiltersServiceGetListOptions): Promise<FoundExceptionListItemSchema>;
  getOne(id: string): Promise<ExceptionListItemSchema>;
  updateOne(exception: Immutable<UpdateExceptionListItemSchema>): Promise<ExceptionListItemSchema>;
  deleteOne(id: string): Promise<ExceptionListItemSchema>;
  getSummary(filter?: string): Promise<ExceptionListSummarySchema>;
}

export interface EventFiltersListPageData {
  /** The query that was used to retrieve the data */
  query: EventFiltersServiceGetListOptions;
  /** The data retrieved from the API */
  content: FoundExceptionListItemSchema;
}
