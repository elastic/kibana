/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import type {
  FoundExceptionListItemSchema,
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
  ExceptionListSummarySchema,
} from '@kbn/securitysolution-io-ts-list-types';

import { Immutable } from '../../../../../common/endpoint/types';

import { EventFiltersService } from '../types';
import {
  addEventFilters,
  getList,
  getOne,
  updateOne,
  deleteOne,
  getSummary,
} from './service_actions';

/**
 * @deprecated Don't use this class for future implementations, use the service_actions module instead!
 */
export class EventFiltersHttpService implements EventFiltersService {
  constructor(private http: HttpStart) {
    this.http = http;
  }

  async getList({
    perPage,
    page,
    sortField,
    sortOrder,
    filter,
  }: Partial<{
    page: number;
    perPage: number;
    sortField: string;
    sortOrder: string;
    filter: string;
  }> = {}): Promise<FoundExceptionListItemSchema> {
    return getList({ http: this.http, perPage, page, sortField, sortOrder, filter });
  }

  async addEventFilters(exception: ExceptionListItemSchema | CreateExceptionListItemSchema) {
    return addEventFilters(this.http, exception);
  }

  async getOne(id: string) {
    return getOne(this.http, id);
  }

  async updateOne(
    exception: Immutable<UpdateExceptionListItemSchema>
  ): Promise<ExceptionListItemSchema> {
    return updateOne(this.http, exception);
  }

  async deleteOne(id: string): Promise<ExceptionListItemSchema> {
    return deleteOne(this.http, id);
  }

  async getSummary(filter?: string): Promise<ExceptionListSummarySchema> {
    return getSummary({ http: this.http, filter });
  }
}
