/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { InternalFileShareService } from './internal_file_share_service';
export type {
  CreateShareArgs,
  DeleteArgs as DeleteShareArgs,
  DeleteForFileArgs as DeleteSharesForFileArgs,
  GetArgs as GetShareArgs,
  ListArgs as ListSharesArgs,
  UpdateArgs as UpdateShareArgs,
} from './internal_file_share_service';
export type { FileShareServiceStart } from './types';
