/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { File } from '../../common';
import {
  CreateFileArgs,
  UpdateFileArgs,
  DeleteFileArgs,
  FindFileArgs,
  ListFilesArgs,
} from './internal_file_service';

// TODO: Add file kind registry
// export interface FileServiceSetup {}

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
   * Find a file. Will throw if file cannot be found.
   */
  find<M>(args: FindFileArgs): Promise<File<M>>;

  /**
   * List all files of specific file kind.
   */
  list<M>(args: ListFilesArgs): Promise<Array<File<M>>>;
}
