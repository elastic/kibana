/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from '../../../../../src/core/public';
import { FoundListSchema, ListSchema, Type } from '../../common/schemas';
import { LIST_ITEM_URL, LIST_URL } from '../../common/constants';

export interface FindListsParams {
  http: HttpStart;
  pageSize: number | undefined;
  pageIndex: number | undefined;
  signal: AbortSignal;
}

export const findLists = async ({
  http,
  pageIndex,
  pageSize,
  signal,
}: FindListsParams): Promise<FoundListSchema> => {
  return http.fetch(`${LIST_URL}/_find`, {
    method: 'GET',
    query: {
      page: pageIndex,
      per_page: pageSize,
    },
    signal,
  });
};

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

export const deleteList = async ({ http, id, signal }: DeleteListParams): Promise<ListSchema> => {
  return http.fetch<ListSchema>(LIST_URL, {
    method: 'DELETE',
    query: { id },
    signal,
  });
};

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
