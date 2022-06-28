/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as qs from 'query-string';
import { PLUGIN_ID } from './constants';
import { FileJSON } from './types';

const API_BASE_PATH = `/api/${PLUGIN_ID}`;

const FILES_API_BASE_PATH = `${API_BASE_PATH}/files`;

export const FILE_KIND_API_ROUTES = {
  getCreateFileRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}`,
  getUploadRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{id}/blob`,
  getDownloadRoute: (fileKind: string) =>
    `${FILES_API_BASE_PATH}/${fileKind}/{id}/blob/{fileName?}`,
  getUpdateRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{id}`,
  getDeleteRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{id}`,
  getListRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/list`,
  getByIdRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{id}`,
};

export const FILE_KIND_API_ROUTES_FILLED = {
  getCreateFileRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}`,
  getUploadRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}/blob`,
  getDownloadRoute: (fileKind: string, id: string, fileName?: string) =>
    `${FILES_API_BASE_PATH}/${fileKind}/${id}/blob/${fileName ? fileName : ''}`,
  getUpdateRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}`,
  getDeleteRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}`,
  getListRoute: (fileKind: string, page?: number, perPage?: number) => {
    const qParams = qs.stringify({ page, perPage });
    return `${FILES_API_BASE_PATH}/${fileKind}/list${qParams ? `?${qParams}` : ''}`;
  },
  getByIdRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}`,
};

export interface HttpApiInterfaceEntryDefinition<
  P = unknown,
  Q = unknown,
  B = unknown,
  R = unknown
> {
  inputs: {
    params: P;
    query: Q;
    body: B;
  };
  output: R;
}

export type CreateHttpEndpoint = HttpApiInterfaceEntryDefinition<
  unknown,
  unknown,
  {
    name: string;
    alt?: string;
    meta?: Record<string, unknown>;
    mime?: string;
  },
  { file: FileJSON }
>;

export type DeleteHttpEndpoint = HttpApiInterfaceEntryDefinition<
  {
    id: string;
  },
  unknown,
  unknown,
  { ok: true }
>;

export type DownloadHttpEndpoint = HttpApiInterfaceEntryDefinition<
  {
    id: string;
    fileName?: string;
  },
  unknown,
  unknown,
  // Should be a readable stream
  any
>;

export type GetByIdHttpEndpoint = HttpApiInterfaceEntryDefinition<
  {
    id: string;
  },
  unknown,
  unknown,
  { file: FileJSON }
>;

export type ListHttpEndpoint = HttpApiInterfaceEntryDefinition<
  unknown,
  { page?: number; perPage?: number },
  unknown,
  { files: FileJSON[] }
>;

export type UpdateHttpEndpoint = HttpApiInterfaceEntryDefinition<
  { id: string },
  unknown,
  { name?: string; alt?: string; meta?: Record<string, unknown> },
  { file: FileJSON }
>;

export type UploadHttpEndpoint = HttpApiInterfaceEntryDefinition<
  { id: string },
  unknown,
  any,
  { ok: true }
>;

/**
 * Types describing the full files public HTTP API interface
 */
export interface HttpApiInterface {
  create: CreateHttpEndpoint;
  delete: DeleteHttpEndpoint;
  download: DownloadHttpEndpoint;
  getById: GetByIdHttpEndpoint;
  list: ListHttpEndpoint;
  update: UpdateHttpEndpoint;
  upload: UploadHttpEndpoint;
}
