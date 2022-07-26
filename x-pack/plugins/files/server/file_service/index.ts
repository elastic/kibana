/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { FileServiceFactory } from './file_service_factory';
export type {
  FileServiceStart,
  CreateFileArgs,
  DeleteFileArgs,
  FindFileArgs,
  GetByIdArgs,
  ListFilesArgs,
  UpdateFileArgs,
} from './file_service';
export * as errors from './errors';
