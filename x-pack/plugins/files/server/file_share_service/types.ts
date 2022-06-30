/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileShareJSON, FileShareSavedObjectAttributes } from '../../common/types';
import type { GetArgs, UpdateArgs } from './internal_file_share_service';

/**
 * We only expose functionality here that do not require you to have a {@link File}
 * instance loaded.
 */
export interface FileShareServiceStart {
  /**
   * Get a share instance
   */
  get(arg: GetArgs): Promise<FileShareJSON>;

  /**
   * Update a share instance.
   */
  update(args: UpdateArgs): Promise<FileShareSavedObjectAttributes & { id: string }>;
}
