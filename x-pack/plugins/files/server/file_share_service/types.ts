/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileShareJSON } from '../../common/types';
import type {
  CreateShareArgs,
  DeleteArgs,
  DeleteForFileArgs,
  GetArgs,
  ListArgs,
  UpdateArgs,
} from './file_share_service';

export interface FileShareServiceStart {
  /**
   * Create a new share instance for a file.
   */
  share(arg: CreateShareArgs): Promise<FileShareJSON>;

  /**
   * Delete a share instance.
   */
  delete(arg: DeleteArgs): Promise<void>;

  /**
   * Delete all share instances for a file
   */
  deleteForFile(arg: DeleteForFileArgs): Promise<void>;

  /**
   * Get a share instance
   */
  get(arg: GetArgs): Promise<FileShareJSON>;

  /**
   * Update a share instance.
   */
  update(args: UpdateArgs): Promise<FileShareJSON>;

  /**
   * List all share instances for a file
   */
  list(args: ListArgs): Promise<FileShareJSON[]>;
}
