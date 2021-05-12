/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '../../../shared_imports';
import { AsyncResourceState } from '../../state/async_resource_state';
import { Immutable } from '../../../../common/endpoint/types';
import { FoundExceptionListItemSchema } from '../../../../../lists/common/schemas';

export interface EventFiltersPageLocation {
  page_index: number;
  page_size: number;
  show?: 'create' | 'edit';
  /** Used for editing. The ID of the selected event filter */
  id?: string;
  filter: string;
}

export interface EventFiltersForm {
  entry: UpdateExceptionListItemSchema | CreateExceptionListItemSchema | undefined;
  newComment: string;
  hasNameError: boolean;
  hasItemsError: boolean;
  hasOSError: boolean;
  submissionResourceState: AsyncResourceState<ExceptionListItemSchema>;
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
}

export interface EventFiltersListPageData {
  /** The query that was used to retrieve the data */
  query: EventFiltersServiceGetListOptions;
  /** The data retrieved from the API */
  content: FoundExceptionListItemSchema;
}

export interface EventFiltersListPageState {
  entries: ExceptionListItemSchema[];
  form: EventFiltersForm;
  location: EventFiltersPageLocation;
  /** State for the Event Filters List page */
  listPage: {
    active: boolean;
    forceRefresh: boolean;
    data: AsyncResourceState<EventFiltersListPageData>;
    /** tracks if the overall list (not filtered or with invalid page numbers) contains data */
    dataExist: AsyncResourceState<boolean>;
  };
}
