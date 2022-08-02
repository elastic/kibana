/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_FIXED_SIZE_INDEX_BLOB_STORE } from '../../../common/constants';
import type { FileJSON, FileMetadata, FilesMetrics } from '../../../common/types';
import type { FindFileArgs } from '../../file_service/file_action_types';

export interface GetUsageMetricsArgs {
  [ES_FIXED_SIZE_INDEX_BLOB_STORE]: { capacity: number };
}

export interface FileDescriptor<M = unknown> {
  id: string;
  metadata: FileMetadata<M>;
}

export interface Pagination {
  page?: number;
  perPage?: number;
}

export interface FileMetadataClient {
  create(arg: FileDescriptor): Promise<FileDescriptor>;
  get(arg: { id: string }): Promise<FileDescriptor>;
  update(arg: FileDescriptor): Promise<FileDescriptor>;
  delete(arg: { id: string }): Promise<void>;
  list(arg: { fileKind: string } & Pagination): Promise<FileDescriptor[]>;
  findJSON(arg: FindFileArgs & Pagination): Promise<FileJSON[]>;
  getUsageMetrics(arg: GetUsageMetricsArgs): Promise<FilesMetrics>;
}
