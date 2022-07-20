/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as qs from 'query-string';
import { PLUGIN_ID } from './constants';
import type { FileJSON, FilesMetrics } from './types';

const API_BASE_PATH = `/api/${PLUGIN_ID}`;

const FILES_API_BASE_PATH = `${API_BASE_PATH}/files`;

export const FILE_KIND_API_ROUTES_SERVER = {
  getCreateFileRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}`,
  getUploadRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{id}/blob`,
  getDownloadRoute: (fileKind: string) =>
    `${FILES_API_BASE_PATH}/${fileKind}/{id}/blob/{fileName?}`,
  getUpdateRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{id}`,
  getDeleteRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{id}`,
  getListRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/list`,
  getByIdRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/{id}`,
};

export const FILE_KIND_API_ROUTES_CLIENT = {
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

export const FILES_API_ROUTES = {
  find: `${FILES_API_BASE_PATH}/find`,
  metrics: `${FILES_API_BASE_PATH}/metrics`,
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

export type CreateFileKindHttpEndpoint = HttpApiInterfaceEntryDefinition<
  unknown,
  unknown,
  {
    name: string;
    alt?: string;
    meta?: Record<string, unknown>;
    mimeType?: string;
  },
  { file: FileJSON }
>;

export type DeleteFileKindHttpEndpoint = HttpApiInterfaceEntryDefinition<
  {
    id: string;
  },
  unknown,
  unknown,
  { ok: true }
>;

export type DownloadFileKindHttpEndpoint = HttpApiInterfaceEntryDefinition<
  {
    id: string;
    fileName?: string;
  },
  unknown,
  unknown,
  // Should be a readable stream
  any
>;

export type GetByIdFileKindHttpEndpoint = HttpApiInterfaceEntryDefinition<
  {
    id: string;
  },
  unknown,
  unknown,
  { file: FileJSON }
>;

export type ListFileKindHttpEndpoint = HttpApiInterfaceEntryDefinition<
  unknown,
  { page?: number; perPage?: number },
  unknown,
  { files: FileJSON[] }
>;

export type UpdateFileKindHttpEndpoint = HttpApiInterfaceEntryDefinition<
  { id: string },
  unknown,
  { name?: string; alt?: string; meta?: Record<string, unknown> },
  { file: FileJSON }
>;

export type UploadFileKindHttpEndpoint = HttpApiInterfaceEntryDefinition<
  { id: string },
  unknown,
  any,
  { ok: true }
>;

export type FindFilesHttpEndpoint = HttpApiInterfaceEntryDefinition<
  unknown,
  { perPage?: number; page?: number },
  {
    /**
     * Filter for set of file-kinds
     */
    kind?: string[];

    /**
     * Filter for match on names
     */
    name?: string[];

    /**
     * Filter for set of meta attributes matching this object
     */
    meta: {};

    /**
     * Filter for exact match on MIME types
     */
    mimeType?: string[];

    /**
     * Filter for match on extensions
     */
    extension?: string[];

    /**
     * Filter for match on extensions
     */
    status?: string[];
  },
  { files: FileJSON[] }
>;

export type FilesMetricsHttpEndpoint = HttpApiInterfaceEntryDefinition<
  unknown,
  unknown,
  unknown,
  FilesMetrics
>;
