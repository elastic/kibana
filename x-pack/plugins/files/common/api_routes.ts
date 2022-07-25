/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN_ID } from './constants';
import type { FileJSON, FileShareJSON, FileShareJSONWithToken, FilesMetrics } from './types';

export const API_BASE_PATH = `/api/${PLUGIN_ID}`;

export const FILES_API_BASE_PATH = `${API_BASE_PATH}/files`;

export const FILES_SHARE_API_BASE_PATH = `${API_BASE_PATH}/share`;

export const FILES_PUBLIC_API_BASE_PATH = `${API_BASE_PATH}/public`;

interface Pagination {
  page?: number;
  perPage?: number;
}

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
  Pagination,
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
  Pagination,
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

export type FileShareHttpEndpoint = HttpApiInterfaceEntryDefinition<
  {
    fileId: string;
  },
  unknown,
  {
    /**
     * Unix timestamp of when the share will expire.
     */
    validUntil?: number;
    /**
     * Optional name to uniquely identify this share instance.
     */
    name?: string;
  },
  FileShareJSONWithToken
>;

export type FileUnshareHttpEndpoint = HttpApiInterfaceEntryDefinition<
  {
    /**
     * Share token id
     */
    id: string;
  },
  unknown,
  unknown,
  {
    ok: true;
  }
>;

export type FileListSharesHttpEndpoint = HttpApiInterfaceEntryDefinition<
  unknown,
  Pagination & { forFileId?: string },
  unknown,
  {
    shares: FileShareJSON[];
  }
>;

export type FilePublicDownloadHttpEndpoint = HttpApiInterfaceEntryDefinition<
  unknown,
  { token: string },
  unknown,
  // Should be a readable stream
  any
>;
