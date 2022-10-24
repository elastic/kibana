/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FileJSON } from '../common';
import type {
  FindFilesHttpEndpoint,
  FileShareHttpEndpoint,
  FileUnshareHttpEndpoint,
  FileGetShareHttpEndpoint,
  FilesMetricsHttpEndpoint,
  ListFileKindHttpEndpoint,
  CreateFileKindHttpEndpoint,
  FileListSharesHttpEndpoint,
  UpdateFileKindHttpEndpoint,
  UploadFileKindHttpEndpoint,
  DeleteFileKindHttpEndpoint,
  GetByIdFileKindHttpEndpoint,
  DownloadFileKindHttpEndpoint,
  FilePublicDownloadHttpEndpoint,
  HttpApiInterfaceEntryDefinition,
} from '../common/api_routes';

type UnscopedClientMethodFrom<E extends HttpApiInterfaceEntryDefinition> = (
  args: E['inputs']['body'] &
    E['inputs']['params'] &
    E['inputs']['query'] & { abortSignal?: AbortSignal }
) => Promise<E['output']>;

/**
 * @param args - Input to the endpoint which includes body, params and query of the RESTful endpoint.
 */
type ClientMethodFrom<E extends HttpApiInterfaceEntryDefinition, ExtraArgs extends {} = {}> = (
  args: Parameters<UnscopedClientMethodFrom<E>>[0] & { kind: string } & ExtraArgs
) => Promise<E['output']>;

interface GlobalEndpoints {
  /**
   * Get metrics of file system, like storage usage.
   *
   * @param args - Get metrics arguments
   */
  getMetrics: () => Promise<FilesMetricsHttpEndpoint['output']>;
  /**
   * Download a file, bypassing regular security by way of a
   * secret share token.
   *
   * @param args - Get public download arguments.
   */
  publicDownload: UnscopedClientMethodFrom<FilePublicDownloadHttpEndpoint>;
  /**
   * Find a set of files given some filters.
   *
   * @param args - File filters
   */
  find: UnscopedClientMethodFrom<FindFilesHttpEndpoint>;
}

/**
 * A client that can be used to manage a specific {@link FileKind}.
 */
export interface FilesClient<M = unknown> extends GlobalEndpoints {
  /**
   * Create a new file object with the provided metadata.
   *
   * @param args - create file args
   */
  create: ClientMethodFrom<CreateFileKindHttpEndpoint<M>>;
  /**
   * Delete a file object and all associated share and content objects.
   *
   * @param args - delete file args
   */
  delete: ClientMethodFrom<DeleteFileKindHttpEndpoint>;
  /**
   * Get a file object by ID.
   *
   * @param args - get file by ID args
   */
  getById: ClientMethodFrom<GetByIdFileKindHttpEndpoint<M>>;
  /**
   * List all file objects, of a given {@link FileKind}.
   *
   * @param args - list files args
   */
  list: ClientMethodFrom<ListFileKindHttpEndpoint<M>>;
  /**
   * Update a set of of metadata values of the file object.
   *
   * @param args - update file args
   */
  update: ClientMethodFrom<UpdateFileKindHttpEndpoint<M>>;
  /**
   * Stream the contents of the file to Kibana server for storage.
   *
   * @param args - upload file args
   */
  upload: (
    args: UploadFileKindHttpEndpoint['inputs']['params'] &
      UploadFileKindHttpEndpoint['inputs']['query'] & {
        /**
         * Should be blob or ReadableStream of some kind.
         */
        body: unknown;
        kind: string;
        abortSignal?: AbortSignal;
        contentType?: string;
      }
  ) => Promise<UploadFileKindHttpEndpoint['output']>;
  /**
   * Stream a download of the file object's content.
   *
   * @param args - download file args
   */
  download: ClientMethodFrom<DownloadFileKindHttpEndpoint>;
  /**
   * Get a string for downloading a file that can be passed to a button element's
   * href for download.
   *
   * @param args - get download URL args
   */
  getDownloadHref: (args: Pick<FileJSON, 'id' | 'fileKind'>) => string;
  /**
   * Share a file by creating a new file share instance.
   *
   * @note This returns the secret token that can be used
   * to access a file via the public download enpoint.
   *
   * @param args - File share arguments
   */
  share: ClientMethodFrom<FileShareHttpEndpoint>;
  /**
   * Delete a file share instance.
   *
   * @param args - File unshare arguments
   */
  unshare: ClientMethodFrom<FileUnshareHttpEndpoint>;
  /**
   * Get a file share instance.
   *
   * @param args - Get file share arguments
   */
  getShare: ClientMethodFrom<FileGetShareHttpEndpoint>;
  /**
   * List all file shares. Optionally scoping to a specific
   * file.
   *
   * @param args - Get file share arguments
   */
  listShares: ClientMethodFrom<FileListSharesHttpEndpoint>;
}

export type FilesClientResponses<M = unknown> = {
  [K in keyof FilesClient]: Awaited<ReturnType<FilesClient<M>[K]>>;
};

/**
 * A files client that is scoped to a specific {@link FileKind}.
 *
 * More convenient if you want to re-use the same client for the same file kind
 * and not specify the kind every time.
 */
export type ScopedFilesClient<M = unknown> = {
  [K in keyof FilesClient]: K extends 'list'
    ? (arg?: Omit<Parameters<FilesClient<M>[K]>[0], 'kind'>) => ReturnType<FilesClient<M>[K]>
    : (arg: Omit<Parameters<FilesClient<M>[K]>[0], 'kind'>) => ReturnType<FilesClient<M>[K]>;
};

/**
 * A factory for creating a {@link ScopedFilesClient}
 */
export interface FilesClientFactory {
  /**
   * Create a files client.
   */
  asUnscoped<M = unknown>(): FilesClient<M>;
  /**
   * Create a {@link ScopedFileClient} for a given {@link FileKind}.
   *
   * @param fileKind - The {@link FileKind} to create a client for.
   */
  asScoped<M = unknown>(fileKind: string): ScopedFilesClient<M>;
}
