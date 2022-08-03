/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_FIXED_SIZE_INDEX_BLOB_STORE } from '../../../common/constants';
import type {
  FileJSON,
  FileMetadata,
  FilesMetrics,
  UpdatableFileMetadata,
} from '../../../common/types';
import type { FindFileArgs } from '../../file_service/file_action_types';

export interface GetUsageMetricsArgs {
  /**
   * The ES backed fixed size storage
   */
  [ES_FIXED_SIZE_INDEX_BLOB_STORE]: {
    /**
     * Use this number to caculate free space when calculating metrics
     */
    capacity: number;
  };
}

/**
 * Meta description a file.
 */
export interface FileDescriptor<M = unknown> {
  /**
   * Unique ID of a file, used to locate a file.
   */
  id: string;
  /**
   * The file's metadata.
   */
  metadata: FileMetadata<M>;
}

export interface UpdateArgs<M = unknown> {
  /**
   * A unique file ID.
   */
  id: string;
  /**
   * The file's metadata.
   */
  metadata: UpdatableFileMetadata<M>;
}

export interface Pagination {
  /**
   * The current page.
   */
  page?: number;
  /**
   * The number of results to include per page.
   */
  perPage?: number;
}

export interface GetArg {
  /**
   * Unique ID of file metadata
   */
  id: string;
}

export interface DeleteArg {
  /**
   * Unique ID of file metadata to delete
   *
   * @note Deleting file metadata should only be done once all other related
   * file objects have been deleted
   */
  id: string;
}

export interface ListArg extends Pagination {
  /**
   * The file kind to scope this query to
   */
  fileKind?: string;
}

export interface FindArg extends Pagination {
  /**
   * The file kind to scope this query to
   */
  fileKind?: string;
}

/**
 * An abstraction of storage implementation of file object's (i.e., metadata)
 */
export interface FileMetadataClient {
  /**
   * Create an instance of file metadata
   *
   * @param arg - Provide an ID and metadata
   */
  create(arg: FileDescriptor): Promise<FileDescriptor>;

  /**
   * Get file metadata
   *
   * @param arg - Arguments to retrieve file metadata
   */
  get(arg: GetArg): Promise<FileDescriptor>;

  /**
   * The file metadata to update
   *
   * @param arg - Arguments to update file metadata
   */
  update(arg: UpdateArgs): Promise<FileDescriptor>;
  /**
   * Delete an instance of file metadata
   *
   * @param arg - Arguments to delete file metadata
   */
  delete(arg: DeleteArg): Promise<void>;
  /**
   * List all instances of metadata for a file kind.
   *
   * @param arg - Arguments to list file metadata
   */
  list(arg: ListArg): Promise<FileDescriptor[]>;
  /**
   * Search for a set of file kind instances that match the filters.
   *
   * @param arg - Filters and other settings to match against
   */
  findJSON(arg: FindFileArgs & Pagination): Promise<FileJSON[]>;
  /**
   * Prepare a set of metrics based on the file metadata.
   */
  getUsageMetrics(arg: GetUsageMetricsArgs): Promise<FilesMetrics>;
}
