/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { chain, fromEither, map, tryCatch } from 'fp-ts/lib/TaskEither';
import { flow } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import {
  DeleteListSchemaEncoded,
  ExportListItemQuerySchemaEncoded,
  FindListSchemaEncoded,
  FoundListSchema,
  ImportListItemQuerySchemaEncoded,
  ImportListItemSchemaEncoded,
  ListSchema,
  deleteListSchema,
  exportListItemQuerySchema,
  findListSchema,
  foundListSchema,
  importListItemQuerySchema,
  importListItemSchema,
  listSchema,
} from '../../common/schemas';
import { LIST_ITEM_URL, LIST_URL } from '../../common/constants';
import { validateEither } from '../../common/siem_common_deps';
import { toPromise } from '../common/fp_utils';

import {
  ApiParams,
  DeleteListParams,
  ExportListParams,
  FindListsParams,
  ImportListParams,
} from './types';

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

const importList = async ({
  file,
  http,
  list_id,
  type,
  signal,
}: ApiParams & ImportListItemSchemaEncoded & ImportListItemQuerySchemaEncoded): Promise<
  ListSchema
> => {
  const formData = new FormData();
  formData.append('file', file as Blob);

  return http.fetch<ListSchema>(`${LIST_ITEM_URL}/_import`, {
    body: formData,
    headers: { 'Content-Type': undefined },
    method: 'POST',
    query: { list_id, type },
    signal,
  });
};

const importListWithValidation = async ({
  file,
  http,
  listId,
  type,
  signal,
}: ImportListParams): Promise<ListSchema> =>
  pipe(
    {
      list_id: listId,
      type,
    },
    (query) => fromEither(validateEither(importListItemQuerySchema, query)),
    chain((query) =>
      pipe(
        fromEither(validateEither(importListItemSchema, { file })),
        map((body) => ({ ...body, ...query }))
      )
    ),
    chain((payload) => tryCatch(() => importList({ http, signal, ...payload }), String)),
    chain((response) => fromEither(validateEither(listSchema, response))),
    flow(toPromise)
  );

export { importListWithValidation as importList };

const deleteList = async ({
  http,
  id,
  signal,
}: ApiParams & DeleteListSchemaEncoded): Promise<ListSchema> =>
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

const exportList = async ({
  http,
  list_id,
  signal,
}: ApiParams & ExportListItemQuerySchemaEncoded): Promise<Blob> =>
  http.fetch<Blob>(`${LIST_ITEM_URL}/_export`, {
    method: 'POST',
    query: { list_id },
    signal,
  });

const exportListWithValidation = async ({
  http,
  listId,
  signal,
}: ExportListParams): Promise<Blob> =>
  pipe(
    { list_id: listId },
    (payload) => fromEither(validateEither(exportListItemQuerySchema, payload)),
    chain((payload) => tryCatch(() => exportList({ http, signal, ...payload }), String)),
    chain((response) => fromEither(validateEither(listSchema, response))),
    flow(toPromise)
  );

export { exportListWithValidation as exportList };
