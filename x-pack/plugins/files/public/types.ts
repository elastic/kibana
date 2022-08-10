/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HttpApiInterfaceEntryDefinition,
  CreateFileKindHttpEndpoint,
  DeleteFileKindHttpEndpoint,
  DownloadFileKindHttpEndpoint,
  GetByIdFileKindHttpEndpoint,
  ListFileKindHttpEndpoint,
  UpdateFileKindHttpEndpoint,
  UploadFileKindHttpEndpoint,
} from '../common/api_routes';

/**
 * @param args - Input to the endpoint which includes body, params and query of the RESTful endpoint.
 */
type ClientMethodFrom<E extends HttpApiInterfaceEntryDefinition> = (
  args: E['inputs']['body'] & E['inputs']['params'] & E['inputs']['query']
) => Promise<E['output']>;

/**
 * A client that can be used to manage a specific {@link FileKind}.
 */
export interface FilesClient {
  /**
   * Create a new file object with the provided metadata.
   *
   * @param args - create file args
   */
  create: ClientMethodFrom<CreateFileKindHttpEndpoint>;
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
  getById: ClientMethodFrom<GetByIdFileKindHttpEndpoint>;
  /**
   * List all file objects, of a given {@link FileKind}.
   *
   * @param args - list files args
   */
  list: ClientMethodFrom<ListFileKindHttpEndpoint>;
  /**
   * Update a set of of metadata values of the file object.
   *
   * @param args - update file args
   */
  update: ClientMethodFrom<UpdateFileKindHttpEndpoint>;
  /**
   * Stream the contents of the file to Kibana server for storage.
   *
   * @param args - upload file args
   */
  upload: ClientMethodFrom<UploadFileKindHttpEndpoint>;
  /**
   * Stream a download of the file object's content.
   *
   * @param args - download file args
   */
  download: ClientMethodFrom<DownloadFileKindHttpEndpoint>;
}

/**
 * A factory for creating a {@link FilesClient}
 */
export interface FilesClientFactory {
  /**
   * Create a {@link FileClient} for a given {@link FileKind}.
   *
   * @param fileKind - The {@link FileKind} to create a client for.
   */
  asScoped(fileKind: string): FilesClient;
}
