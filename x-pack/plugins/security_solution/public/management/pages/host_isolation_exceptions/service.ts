/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  ExceptionListSummarySchema,
  FoundExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { transformNewItemOutput, transformOutput } from '@kbn/securitysolution-list-hooks';
import { HttpStart } from '@kbn/core/public';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '../event_filters/constants';
import { HOST_ISOLATION_EXCEPTIONS_LIST_DEFINITION } from './constants';

async function createHostIsolationExceptionList(http: HttpStart): Promise<void> {
  try {
    await http.post<ExceptionListItemSchema>(EXCEPTION_LIST_URL, {
      body: JSON.stringify(HOST_ISOLATION_EXCEPTIONS_LIST_DEFINITION),
    });
  } catch (err) {
    // Ignore 409 errors. List already created
    if (err.response?.status !== 409) {
      throw err;
    }
  }
}

let listExistsPromise: Promise<void>;
async function ensureHostIsolationExceptionsListExists(http: HttpStart): Promise<void> {
  if (!listExistsPromise) {
    listExistsPromise = createHostIsolationExceptionList(http);
  }
  await listExistsPromise;
}

export async function getHostIsolationExceptionItems({
  http,
  perPage,
  page,
  sortField = 'created_at',
  sortOrder = 'desc',
  filter,
}: {
  http: HttpStart;
  page?: number;
  perPage?: number;
  sortField?: keyof ExceptionListItemSchema;
  sortOrder?: 'asc' | 'desc';
  filter?: string;
}): Promise<FoundExceptionListItemSchema> {
  await ensureHostIsolationExceptionsListExists(http);
  const entries: FoundExceptionListItemSchema = await http.get(`${EXCEPTION_LIST_ITEM_URL}/_find`, {
    query: {
      list_id: [ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID],
      namespace_type: ['agnostic'],
      page,
      per_page: perPage,
      sort_field: sortField,
      sort_order: sortOrder,
      filter,
    },
  });
  return entries;
}

export async function createHostIsolationExceptionItem(
  http: HttpStart,
  exception: CreateExceptionListItemSchema
): Promise<ExceptionListItemSchema> {
  await ensureHostIsolationExceptionsListExists(http);
  const entry = transformNewItemOutput(exception);
  return http.post<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
    body: JSON.stringify(entry),
  });
}

export async function deleteOneHostIsolationExceptionItem(http: HttpStart, id: string) {
  await ensureHostIsolationExceptionsListExists(http);
  return http.delete<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
    query: {
      id,
      namespace_type: 'agnostic',
    },
  });
}

export async function getOneHostIsolationExceptionItem(
  http: HttpStart,
  id: string
): Promise<UpdateExceptionListItemSchema> {
  await ensureHostIsolationExceptionsListExists(http);
  return http.get<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
    query: {
      id,
      namespace_type: 'agnostic',
    },
  });
}

export async function updateOneHostIsolationExceptionItem(
  http: HttpStart,
  exception: UpdateExceptionListItemSchema
): Promise<ExceptionListItemSchema> {
  await ensureHostIsolationExceptionsListExists(http);
  const entry = transformOutput(exception);

  // Clean unnecessary fields for update action
  const fieldsToRemove: Array<keyof ExceptionListItemSchema> = [
    'created_at',
    'created_by',
    'created_at',
    'created_by',
    'list_id',
    'tie_breaker_id',
    'updated_at',
    'updated_by',
  ];

  fieldsToRemove.forEach((field) => {
    delete entry[field as keyof UpdateExceptionListItemSchema];
  });
  return http.put<ExceptionListItemSchema>(EXCEPTION_LIST_ITEM_URL, {
    body: JSON.stringify(entry),
  });
}
export async function getHostIsolationExceptionSummary(
  http: HttpStart,
  filter?: string
): Promise<ExceptionListSummarySchema> {
  return http.get<ExceptionListSummarySchema>(`${EXCEPTION_LIST_URL}/summary`, {
    query: {
      filter,
      list_id: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
      namespace_type: 'agnostic',
    },
  });
}
