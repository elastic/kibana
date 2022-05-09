/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { SavedObjectAttributes } from '@kbn/core/server';

export type FileStatus = 'AWAITING_UPLOAD' | 'UPLOAD_FAILED' | 'AVAILABLE';

export interface FileSavedObjectAttributes extends SavedObjectAttributes {
  created_at: string;

  updated_at: string;

  /**
   * User-friendly name given to the file
   */
  name: string;

  status: FileStatus;

  /**
   * Unique ID of the user that created this file.
   *
   * @note
   * May not be available since we do not have a reliable unique ID for users unless we combine
   * user name and realm. Security will expose truly unique user IDs in the future so if we use this
   * we may need to migrate this data in the future.
   *
   * TODO: Should we just exclude this entirely for now?
   */
  created_by?: string;

  /**
   * An identifier for the type of storage where the file is saved. This could be in
   * ES, AWS S3, Google Cloud Storage or any other blob storage.
   */
  storage_id: string;

  /**
   * A unique ID for file content that enables retrieval from a blob store.
   *
   * May not be available at the time this object is created
   */
  content_ref?: string;

  /**
   * MIME type of the file content
   */
  content_type?: string;

  /**
   * Size of the contents in bytes.
   */
  size?: number;
}
