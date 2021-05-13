/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  UpdateExceptionListItemSchema,
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
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
}>;

export interface EventFiltersService {
  addEventFilters(
    exception: Immutable<ExceptionListItemSchema | CreateExceptionListItemSchema>
  ): Promise<ExceptionListItemSchema>;

  getList(options?: EventFiltersServiceGetListOptions): Promise<FoundExceptionListItemSchema>;
  getOne(id: string): Promise<ExceptionListItemSchema>;
  updateOne(exception: Immutable<UpdateExceptionListItemSchema>): Promise<ExceptionListItemSchema>;
}
