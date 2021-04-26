/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema, CreateExceptionListItemSchema } from '../../../../shared_imports';
import { AsyncResourceState } from '../../../state/async_resource_state';

export interface EventFiltersPageLocation {
  page_index: number;
  page_size: number;
  show?: 'create' | 'edit';
  /** Used for editing. The ID of the selected event filter */
  id?: string;
  filter: string;
}
export interface EventFiltersListPageState {
  entries: ExceptionListItemSchema[];
  form: {
    entry: CreateExceptionListItemSchema | ExceptionListItemSchema | undefined;
    hasNameError: boolean;
    hasItemsError: boolean;
    hasOSError: boolean;
    submissionResourceState: AsyncResourceState<ExceptionListItemSchema>;
  };
  location: EventFiltersPageLocation;
}
