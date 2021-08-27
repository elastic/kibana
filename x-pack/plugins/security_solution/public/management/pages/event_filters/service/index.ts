/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from 'kibana/public';
import type {
  FoundExceptionListItemSchema,
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
  ExceptionListSummarySchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_EVENT_FILTERS_LIST_ID } from '@kbn/securitysolution-list-constants';

import { Immutable } from '../../../../../common/endpoint/types';

import { EVENT_FILTER_LIST, EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '../constants';
import { EventFiltersService } from '../types';

export class EventFiltersHttpService implements EventFiltersService {
  private listHasBeenCreated: boolean;

  constructor(private http: HttpStart) {
    this.listHasBeenCreated = false;
  }

  private async createEndpointEventList() {
    try {
      await this.http.post<ExceptionListItemSchema>(EXCEPTION_LIST_URL, {
        body: JSON.stringify(EVENT_FILTER_LIST),
      });
      this.listHasBeenCreated = true;
    } catch (err) {
      // Ignore 409 errors. List already created
      if (err.response.status === 409) this.listHasBeenCreated = true;
      else throw err;
    }
  }

  private async httpWrapper() {
    if (!this.listHasBeenCreated) await this.createEndpointEventList();
    return this.http;
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
    const http = await this.httpWrapper();
    return http.get(`${EXCEPTION_LIST_ITEM_URL}/_find`, {
      query: {
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder,
        list_id: [ENDPOINT_EVENT_FILTERS_LIST_ID],
        namespace_type: ['agnostic'],
        filter,
      },
    });
  }

  async addEventFilters(exception: ExceptionListItemSchema | CreateExceptionListItemSchema) {
    return (await this.httpWrapper()).post<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
      body: JSON.stringify(exception),
    });
  }

  async getOne(id: string) {
    return (await this.httpWrapper()).get<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
      query: {
        id,
        namespace_type: 'agnostic',
      },
    });
  }

  async updateOne(
    exception: Immutable<UpdateExceptionListItemSchema>
  ): Promise<ExceptionListItemSchema> {
    return (await this.httpWrapper()).put<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
      body: JSON.stringify(exception),
    });
  }

  async deleteOne(id: string): Promise<ExceptionListItemSchema> {
    return (await this.httpWrapper()).delete<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
      query: {
        id,
        namespace_type: 'agnostic',
      },
    });
  }

  async getSummary(): Promise<ExceptionListSummarySchema> {
    return (await this.httpWrapper()).get<ExceptionListSummarySchema>(
      `${EXCEPTION_LIST_URL}/summary`,
      {
        query: {
          list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
          namespace_type: 'agnostic',
        },
      }
    );
  }
}
