/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Pagination, UpdatableFileMetadata } from '../../common/types';

/**
 * Arguments to create a new file.
 */
export interface CreateFileArgs<Meta = unknown> {
  /**
   * File name
   */
  name: string;
  /**
   * File kind, must correspond to a registered {@link FileKind}.
   */
  fileKind: string;
  /**
   * Username of the user who created the file.
   */
  createdBy?: string;
  /**
   * Alternate text for accessibility and display purposes.
   */
  alt?: string;
  /**
   * Custom metadata like tags or identifiers for the file.
   */
  meta?: Meta;
  /**
   * The MIME type of the file.
   */
  mime?: string;
}

/**
 * Arguments to update a file
 */
export interface UpdateFileArgs {
  /**
   * File ID.
   */
  id: string;
  /**
   * File kind, must correspond to a registered {@link FileKind}.
   */
  fileKind: string;
  /**
   * Attributes to update.
   */
  attributes: UpdatableFileMetadata;
}

/**
 * Arguments to delete a file.
 */
export interface DeleteFileArgs {
  /**
   * File ID.
   */
  id: string;
  /**
   * File kind, must correspond to a registered {@link FileKind}.
   */
  fileKind: string;
}

/**
 * Arguments to get a file by ID.
 */
export interface GetByIdArgs {
  /**
   * File ID.
   */
  id: string;
  /**
   * File kind, must correspond to a registered {@link FileKind}.
   */
  fileKind: string;
}

/**
 * Arguments to filter for files.
 *
 * @note Individual values in a filter are "OR"ed together filters are "AND"ed together.
 */
export interface FindFileArgs extends Pagination {
  /**
   * File kind(s), see {@link FileKind}.
   */
  kind?: string[];
  /**
   * File name(s).
   */
  name?: string[];
  /**
   * File extension(s).
   */
  extension?: string[];
  /**
   * File status(es).
   */
  status?: string[];
  /**
   * File metadata values. These values are governed by the consumer.
   */
  meta?: Record<string, string>;
}
