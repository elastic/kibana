/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Immutable } from '../../../../common/endpoint/types';
import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '../../../../../lists/common';
import { FoundExceptionListItemSchema } from '../../../../../lists/common/schemas';

export interface EventFiltersListPageUrlSearchParams {
  page_index: number;
  page_size: number;
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
}
