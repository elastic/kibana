/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The Metadata information about a file that was uploaded by Endpoint
 * as a result of a `get-file` response action
 */
export interface UploadedFile {
  file: {
    /** The chunk size used for each chunk in this file */
    ChunkSize?: number;
    /**
     * - `AWAITING_UPLOAD`: file metadata has been created. File is ready to be uploaded.
     * - `UPLOADING`: file contents are being uploaded.
     * - `READY`: file has been uploaded, successfully, without errors.
     * - `UPLOAD_ERROR`: an error happened while the file was being uploaded, file contents
     *    are most likely corrupted.
     * - `DELETED`: file is deleted. Files can be marked as deleted before the actual deletion
     *    of the contents and metadata happens. Deleted files should be treated as if they don’t
     *    exist. Only files in READY state can transition into DELETED state.
     */
    Status: 'AWAITING_UPLOAD' | 'UPLOADING' | 'READY' | 'UPLOAD_ERROR' | 'DELETED';
    /** File extension (if any) */
    extension?: string;
    hash?: {
      md5?: string;
      sha1?: string;
      sha256?: string;
      sha384?: string;
      sha512?: string;
      ssdeep?: string;
      tlsh?: string;
    };
    mime_type?: string;
    mode?: string;
    /** File name */
    name: string;
    /** The full path to the file on the host machine */
    path: string;
    /** The total size in bytes */
    size: number;
    created?: string;
    type: string;
  };
}
