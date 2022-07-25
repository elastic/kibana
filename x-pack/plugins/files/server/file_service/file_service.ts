/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { File, FileJSON, FilesMetrics } from '../../common';
import type { FileShareServiceStart } from '../file_share_service/types';
import type {
  CreateFileArgs,
  UpdateFileArgs,
  DeleteFileArgs,
  GetByIdArgs,
  ListFilesArgs,
  FindFileArgs,
} from './internal_file_service';

/**
 * Public file service interface.
 */
export interface FileServiceStart {
  /**
   * Create a new file.
   *
   * Once created, the file content can be uploaded. See {@link File}.
   */
  create<M>(args: CreateFileArgs<M>): Promise<File<M>>;

  /**
   * Update updatable file attributes like name and meta.
   */
  update<M>(args: UpdateFileArgs): Promise<File<M>>;

  /**
   * Delete a file.
   */
  delete(args: DeleteFileArgs): Promise<void>;

  /**
   * Get a file by ID. Will throw if file cannot be found.
   */
  getById<M>(args: GetByIdArgs): Promise<File<M>>;

  /**
   * Find files given a set of parameters.
   */
  find<M>(args: FindFileArgs): Promise<Array<FileJSON<M>>>;

  /**
   * List all files of specific file kind.
   */
  list<M>(args: ListFilesArgs): Promise<Array<File<M>>>;

  /**
   * Get an instance of a share object
   */
  getShareObject: FileShareServiceStart['get'];

  /**
   * List share objects
   */
  listShareObjects: FileShareServiceStart['list'];

  /**
   * Update an instance of a share object
   */
  updateShareObject: FileShareServiceStart['update'];

  /**
   * Delete a share instance
   */
  deleteShareObject: FileShareServiceStart['delete'];

  /**
   * Get the current usage metrics for all storage media.
   *
   * Returns diagnostics or `undefined` if metrics could not be retrieved.
   */
  getUsageMetrics(): Promise<FilesMetrics>;

  /**
   * Get a file by a shareable token.
   */
  getByToken<M>(token: string): Promise<File<M>>;
}
