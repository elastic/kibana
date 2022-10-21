/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { EsIndexFilesMetadataClient, SavedObjectsFileMetadataClient } from './file_metadata_client';
export type {
  FileMetadataClient,
  DeleteMetedataArg,
  FileDescriptor,
  FindMetadataArg,
  GetMetadataArg,
  GetUsageMetricsArgs,
  UpdateMetadataArg,
} from './file_metadata_client';
export { FileClientImpl } from './file_client';
export type { FileClient } from './types';
export { createEsFileClient } from './create_es_file_client';
export type { CreateEsFileClientArgs } from './create_es_file_client';
export {
  AlreadyDeletedError,
  ContentAlreadyUploadedError,
  NoDownloadAvailableError,
  UploadInProgressError,
} from '../file/errors';
