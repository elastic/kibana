/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListItemSchema,
  ExceptionListSummarySchema,
  FoundExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { HttpStart } from '@kbn/core/public';
import {
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
  EVENT_FILTER_LIST_DEFINITION,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
} from '../constants';
import type { Immutable } from '../../../../../common/endpoint/types';

async function createEventFilterList(http: HttpStart): Promise<void> {
  try {
    await http.post<ExceptionListItemSchema>(EXCEPTION_LIST_URL, {
      body: JSON.stringify(EVENT_FILTER_LIST_DEFINITION),
    });
  } catch (err) {
    // Ignore 409 errors. List already created
    if (err.response?.status !== 409) {
      throw err;
    }
  }
}

let listExistsPromise: Promise<void>;
export async function ensureEventFiltersListExists(http: HttpStart): Promise<void> {
  if (!listExistsPromise) {
    listExistsPromise = createEventFilterList(http);
  }
  await listExistsPromise;
}

export async function getList({
  http,
  perPage,
  page,
  sortField,
  sortOrder,
  filter,
}: {
  http: HttpStart;
  page?: number;
  perPage?: number;
  sortField?: string;
  sortOrder?: string;
  filter?: string;
}): Promise<FoundExceptionListItemSchema> {
  await ensureEventFiltersListExists(http);
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

export async function getSummary({
  http,
  filter,
}: {
  http: HttpStart;
  filter?: string;
}): Promise<ExceptionListSummarySchema> {
  await ensureEventFiltersListExists(http);
  return http.get<ExceptionListSummarySchema>(`${EXCEPTION_LIST_URL}/summary`, {
    query: {
      filter,
      list_id: ENDPOINT_EVENT_FILTERS_LIST_ID,
      namespace_type: 'agnostic',
    },
  });
}

export function cleanEventFilterToUpdate(
  exception: Immutable<UpdateExceptionListItemSchema>
): UpdateExceptionListItemSchema {
  const exceptionToUpdateCleaned = { ...exception };
  // Clean unnecessary fields for update action
  [
    'created_at',
    'created_by',
    'list_id',
    'tie_breaker_id',
    'updated_at',
    'updated_by',
    'meta',
  ].forEach((field) => {
    delete exceptionToUpdateCleaned[field as keyof UpdateExceptionListItemSchema];
  });

  exceptionToUpdateCleaned.comments = exceptionToUpdateCleaned.comments?.map((comment) => ({
    comment: comment.comment,
    id: comment.id,
  }));

  return exceptionToUpdateCleaned as UpdateExceptionListItemSchema;
}
