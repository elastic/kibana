/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { chain, fromEither, tryCatch } from 'fp-ts/lib/TaskEither';
import { flow } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import { HttpStart } from '../../../../../src/core/public';
import {
  FindListSchemaEncoded,
  FoundListSchema,
  ListSchema,
  Type,
  deleteListSchema,
  findListSchema,
  foundListSchema,
  listSchema,
} from '../../common/schemas';
import { LIST_ITEM_URL, LIST_URL } from '../../common/constants';
import { validateEither } from '../../common/siem_common_deps';
import { toPromise } from '../common/fp_utils';

import { ApiParams } from './types';

const findLists = async ({
  http,
  cursor,
  page,
  per_page,
  signal,
}: ApiParams & FindListSchemaEncoded): Promise<FoundListSchema> => {
  return http.fetch(`${LIST_URL}/_find`, {
    method: 'GET',
    query: {
      cursor,
      page,
      per_page,
    },
    signal,
  });
};

export interface FindListsParams {
  http: HttpStart;
  pageSize: number | undefined;
  pageIndex: number | undefined;
  signal: AbortSignal;
}

const findListsWithValidation = async ({
  http,
  pageIndex,
  pageSize,
  signal,
}: FindListsParams): Promise<FoundListSchema> =>
  pipe(
    {
      page: String(pageIndex),
      per_page: String(pageSize),
    },
    (payload) => fromEither(validateEither(findListSchema, payload)),
    chain((payload) => tryCatch(() => findLists({ http, signal, ...payload }), String)),
    chain((response) => fromEither(validateEither(foundListSchema, response))),
    flow(toPromise)
  );

export { findListsWithValidation as findLists };

export interface ImportListParams {
  http: HttpStart;
  file: File;
  listId: string | undefined;
  signal: AbortSignal;
  type: Type | undefined;
}

export const importList = async ({
  file,
  http,
  listId,
  type,
  signal,
}: ImportListParams): Promise<ListSchema> => {
  const formData = new FormData();
  formData.append('file', file);

  return http.fetch<ListSchema>(`${LIST_ITEM_URL}/_import`, {
    body: formData,
    headers: { 'Content-Type': undefined },
    method: 'POST',
    query: { list_id: listId, type },
    signal,
  });
};

export interface DeleteListParams {
  http: HttpStart;
  id: string;
  signal: AbortSignal;
}

const deleteList = async ({ http, id, signal }: DeleteListParams): Promise<ListSchema> =>
  http.fetch<ListSchema>(LIST_URL, {
    method: 'DELETE',
    query: { id },
    signal,
  });

const deleteListWithValidation = async ({
  http,
  id,
  signal,
}: DeleteListParams): Promise<ListSchema> =>
  pipe(
    { id },
    (payload) => fromEither(validateEither(deleteListSchema, payload)),
    chain((payload) => tryCatch(() => deleteList({ http, signal, ...payload }), String)),
    chain((response) => fromEither(validateEither(listSchema, response))),
    flow(toPromise)
  );

export { deleteListWithValidation as deleteList };

export interface ExportListParams {
  http: HttpStart;
  id: string;
  signal: AbortSignal;
}

export const exportList = async ({ http, id, signal }: ExportListParams): Promise<Blob> => {
  return http.fetch<Blob>(`${LIST_ITEM_URL}/_export`, {
    method: 'POST',
    query: { list_id: id },
    signal,
  });
};
